import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventsGateway } from './events.gateway';
import type { Socket, Server } from 'socket.io';
import type { WebSocketMessage } from '@qa-automater/types';

const mockPublish = vi.fn().mockResolvedValue(1);
let mockMessageCallback: ((msg: WebSocketMessage) => void) | null = null;

vi.mock('@qa-automater/shared', async () => {
  const actual = await vi.importActual('@qa-automater/shared');
  return {
    ...actual,
    EventPublisher: vi.fn().mockImplementation(() => ({
      publish: mockPublish,
      close: vi.fn(),
    })),
    EventSubscriber: vi.fn().mockImplementation(() => ({
      subscribe: vi.fn((_channel, cb) => {
        mockMessageCallback = cb;
      }),
      close: vi.fn(),
    })),
  };
});

describe('EventsGateway', () => {
  let gateway: EventsGateway;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMessageCallback = null;
    gateway = new EventsGateway();
  });

  it('handles room subscription and unsubscription', () => {
    const mockSocket = {
      id: 'socket_1',
      join: vi.fn(),
      leave: vi.fn(),
    } as unknown as Socket;

    const subRes = gateway.handleSubscribeScan(mockSocket, { scan_id: 'scan_100' });
    expect(subRes).toEqual({ status: 'subscribed', scan_id: 'scan_100' });
    expect(mockSocket.join).toHaveBeenCalledWith('scan:scan_100');

    const unsubRes = gateway.handleUnsubscribeScan(mockSocket, { scan_id: 'scan_100' });
    expect(unsubRes).toEqual({ status: 'unsubscribed', scan_id: 'scan_100' });
    expect(mockSocket.leave).toHaveBeenCalledWith('scan:scan_100');
  });

  it('emits scan.progress and scan.complete via EventPublisher', async () => {
    await gateway.emitScanProgress({ scan_id: 'scan_100', phase: 'PARSING', percent: 50 });
    expect(mockPublish).toHaveBeenCalledWith('scan.progress', {
      scan_id: 'scan_100',
      phase: 'PARSING',
      percent: 50,
    });

    await gateway.emitScanComplete({ scan_id: 'scan_100', element_count: 25 });
    expect(mockPublish).toHaveBeenCalledWith('scan.complete', {
      scan_id: 'scan_100',
      element_count: 25,
    });
  });

  it('broadcasts incoming Redis scan.progress events to socket rooms', async () => {
    await gateway.afterInit();

    const mockRoomEmit = vi.fn();
    const mockTo = vi.fn().mockReturnValue({ emit: mockRoomEmit });
    const mockEmit = vi.fn();
    gateway.server = {
      to: mockTo,
      emit: mockEmit,
    } as unknown as Server;

    if (mockMessageCallback) {
      mockMessageCallback({
        event: 'scan.progress',
        data: { scan_id: 'scan_100', phase: 'INDEXING', percent: 80 },
        timestamp: new Date().toISOString(),
      });
    }

    expect(mockTo).toHaveBeenCalledWith('scan:scan_100');
    expect(mockRoomEmit).toHaveBeenCalledWith('scan.progress', {
      scan_id: 'scan_100',
      phase: 'INDEXING',
      percent: 80,
    });
    expect(mockEmit).toHaveBeenCalledWith('scan.progress', {
      scan_id: 'scan_100',
      phase: 'INDEXING',
      percent: 80,
    });
  });

  it('gracefully handles null or malformed Redis PubSub messages without throwing', async () => {
    await gateway.afterInit();

    const mockTo = vi.fn().mockReturnValue({ emit: vi.fn() });
    const mockEmit = vi.fn();
    gateway.server = {
      to: mockTo,
      emit: mockEmit,
    } as unknown as Server;

    expect(() => {
      if (mockMessageCallback) {
        // @ts-expect-error testing null safety
        mockMessageCallback(null);
        // @ts-expect-error testing invalid payload type
        mockMessageCallback('invalid-string-payload');
      }
    }).not.toThrow();

    expect(mockTo).not.toHaveBeenCalled();
    expect(mockEmit).not.toHaveBeenCalled();
  });
});
