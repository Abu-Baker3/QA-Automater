import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { EventsGateway } from './events.gateway';
import { ScansService } from '../scans/scans.service';
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

describe('EventsGateway Integration & E4.4 WebSocket Event Emission', () => {
  let gateway: EventsGateway;
  let scansService: ScansService;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockMessageCallback = null;

    moduleRef = await Test.createTestingModule({
      providers: [EventsGateway, ScansService],
    }).compile();

    gateway = moduleRef.get<EventsGateway>(EventsGateway);
    scansService = moduleRef.get<ScansService>(ScansService);
  });

  it('AC1: Given subscribed client when scan progresses then receive scan.progress with percent', async () => {
    await gateway.afterInit();

    const mockRoomEmit = vi.fn();
    const mockTo = vi.fn().mockReturnValue({ emit: mockRoomEmit });
    const mockEmit = vi.fn();
    gateway.server = {
      to: mockTo,
      emit: mockEmit,
    } as unknown as Server;

    // 1. Client connects and subscribes to scan room
    const mockSocket = {
      id: 'client_socket_42',
      join: vi.fn(),
      leave: vi.fn(),
    } as unknown as Socket;

    const subRes = gateway.handleSubscribeScan(mockSocket, { scan_id: 'scan_444' });
    expect(subRes).toEqual({ status: 'subscribed', scan_id: 'scan_444' });
    expect(mockSocket.join).toHaveBeenCalledWith('scan:scan_444');

    // 2. Scan created in ScansService -> emits scan.progress with percent 0
    const scan = scansService.createScan({
      scan_id: 'scan_444',
      org_id: 'org_test',
      repository_id: 'repo_test',
      files_total: 100,
    });

    expect(mockPublish).toHaveBeenCalledWith('scan.progress', {
      scan_id: 'scan_444',
      phase: 'QUEUED',
      percent: 0,
      files_done: 0,
      files_total: 100,
    });

    // 3. Scan progresses -> PARSING phase, 50 files done -> 50%
    scansService.updateScanProgress(scan.id, {
      status: 'running',
      phase: 'PARSING',
      files_done: 50,
    });

    expect(mockPublish).toHaveBeenCalledWith('scan.progress', {
      scan_id: 'scan_444',
      phase: 'PARSING',
      percent: 50,
      files_done: 50,
      files_total: 100,
    });

    // 4. Redis PubSub message received by EventsGateway -> broadcast to scan room
    if (mockMessageCallback) {
      mockMessageCallback({
        event: 'scan.progress',
        data: { scan_id: 'scan_444', phase: 'PARSING', percent: 50, files_done: 50, files_total: 100 },
        timestamp: new Date().toISOString(),
      });
    }

    expect(mockTo).toHaveBeenCalledWith('scan:scan_444');
    expect(mockRoomEmit).toHaveBeenCalledWith('scan.progress', {
      scan_id: 'scan_444',
      phase: 'PARSING',
      percent: 50,
      files_done: 50,
      files_total: 100,
    });
  });

  it('AC2: Given scan completes when event emitted then scan.complete includes element_count', async () => {
    await gateway.afterInit();

    const mockRoomEmit = vi.fn();
    const mockTo = vi.fn().mockReturnValue({ emit: mockRoomEmit });
    const mockEmit = vi.fn();
    gateway.server = {
      to: mockTo,
      emit: mockEmit,
    } as unknown as Server;

    const scan = scansService.createScan({
      scan_id: 'scan_888',
      org_id: 'org_test',
      repository_id: 'repo_test',
      files_total: 10,
    });

    // Complete scan with element_count = 142
    scansService.updateScanProgress(scan.id, {
      status: 'completed',
      phase: 'COMPLETED',
      files_done: 10,
      framework: 'playwright',
      element_count: 142,
    });

    expect(mockPublish).toHaveBeenCalledWith('scan.complete', {
      scan_id: 'scan_888',
      element_count: 142,
      framework: 'playwright',
    });

    // Redis PubSub event forwarded to socket room
    if (mockMessageCallback) {
      mockMessageCallback({
        event: 'scan.complete',
        data: { scan_id: 'scan_888', element_count: 142, framework: 'playwright' },
        timestamp: new Date().toISOString(),
      });
    }

    expect(mockTo).toHaveBeenCalledWith('scan:scan_888');
    expect(mockRoomEmit).toHaveBeenCalledWith('scan.complete', {
      scan_id: 'scan_888',
      element_count: 142,
      framework: 'playwright',
    });
  });
});
