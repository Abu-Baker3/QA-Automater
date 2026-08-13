import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventPublisher, EventSubscriber, SCAN_EVENTS_CHANNEL } from './pubsub';

const mockPublish = vi.fn().mockResolvedValue(1);
const mockSubscribe = vi.fn().mockResolvedValue('OK');
const mockUnsubscribe = vi.fn().mockResolvedValue('OK');
const mockQuit = vi.fn().mockResolvedValue('OK');
const mockDisconnect = vi.fn();

let messageListener: ((channel: string, messageStr: string) => void) | null = null;

vi.mock('../queue', () => ({
  createRedisClient: vi.fn(() => ({
    publish: mockPublish,
    subscribe: mockSubscribe,
    unsubscribe: mockUnsubscribe,
    quit: mockQuit,
    disconnect: mockDisconnect,
    on: vi.fn((event: string, cb: (channel: string, messageStr: string) => void) => {
      if (event === 'message') {
        messageListener = cb;
      }
    }),
  })),
}));

describe('EventPublisher & EventSubscriber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    messageListener = null;
  });

  it('publishes event with structured payload', async () => {
    const publisher = new EventPublisher();
    await publisher.publish('scan.progress', { scan_id: 'scan_1', phase: 'PARSING', percent: 50 });

    expect(mockPublish).toHaveBeenCalledTimes(1);
    const firstCall = mockPublish.mock.calls[0];
    expect(firstCall).toBeDefined();
    if (firstCall) {
      const channel = firstCall[0] as string;
      const messageStr = firstCall[1] as string;
      expect(channel).toBe(SCAN_EVENTS_CHANNEL);

      const parsed = JSON.parse(messageStr);
      expect(parsed.event).toBe('scan.progress');
      expect(parsed.data).toEqual({ scan_id: 'scan_1', phase: 'PARSING', percent: 50 });
      expect(parsed.timestamp).toBeDefined();
    }

    await publisher.close();
  });

  it('subscribes and receives broadcast events', async () => {
    const subscriber = new EventSubscriber();
    const callback = vi.fn();

    await subscriber.subscribe(SCAN_EVENTS_CHANNEL, callback);
    expect(mockSubscribe).toHaveBeenCalledWith(SCAN_EVENTS_CHANNEL);

    if (messageListener) {
      messageListener(
        SCAN_EVENTS_CHANNEL,
        JSON.stringify({
          event: 'scan.complete',
          data: { scan_id: 'scan_1', element_count: 42 },
          timestamp: new Date().toISOString(),
        }),
      );
    }

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'scan.complete',
        data: { scan_id: 'scan_1', element_count: 42 },
      }),
    );

    await subscriber.unsubscribe(SCAN_EVENTS_CHANNEL, callback);
    expect(mockUnsubscribe).toHaveBeenCalledWith(SCAN_EVENTS_CHANNEL);

    await subscriber.close();
  });
});
