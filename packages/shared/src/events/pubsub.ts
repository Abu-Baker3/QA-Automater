import { createRedisClient, RedisOptions } from '../queue';
import type { WebSocketEventType, WebSocketMessage } from '@qa-automater/types';
import type Redis from 'ioredis';

export const SCAN_EVENTS_CHANNEL = 'qa:events:scan';

export class EventPublisher {
  private redis: Redis;

  constructor(customOpts?: RedisOptions) {
    this.redis = createRedisClient(customOpts);
  }

  async publish<T = unknown>(
    event: WebSocketEventType,
    data: T,
    channel = SCAN_EVENTS_CHANNEL,
  ): Promise<number> {
    const payload: WebSocketMessage<T> = {
      event,
      data,
      timestamp: new Date().toISOString(),
    };
    return this.redis.publish(channel, JSON.stringify(payload));
  }

  async close(): Promise<void> {
    try {
      await this.redis.quit();
    } catch {
      this.redis.disconnect();
    }
  }
}

export type EventCallback = (message: WebSocketMessage) => void;

export class EventSubscriber {
  private redis: Redis;
  private listeners: Map<string, Set<EventCallback>> = new Map();

  constructor(customOpts?: RedisOptions) {
    this.redis = createRedisClient(customOpts);
    this.redis.on('message', (channel, messageStr) => {
      const channelListeners = this.listeners.get(channel);
      if (!channelListeners || channelListeners.size === 0) return;

      try {
        const payload: WebSocketMessage = JSON.parse(messageStr);
        for (const listener of channelListeners) {
          try {
            listener(payload);
          } catch (err) {
            console.error(
              `[EventSubscriber] Error executing listener for channel ${channel}:`,
              err,
            );
          }
        }
      } catch (err) {
        console.error(
          `[EventSubscriber] Failed to parse Redis event from channel ${channel}:`,
          err,
        );
      }
    });
  }

  async subscribe(channel: string, callback: EventCallback): Promise<void> {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
      await this.redis.subscribe(channel);
    }
    this.listeners.get(channel)?.add(callback);
  }

  async unsubscribe(channel: string, callback?: EventCallback): Promise<void> {
    const channelListeners = this.listeners.get(channel);
    if (!channelListeners) return;

    if (callback) {
      channelListeners.delete(callback);
    }

    if (!callback || channelListeners.size === 0) {
      this.listeners.delete(channel);
      await this.redis.unsubscribe(channel);
    }
  }

  async close(): Promise<void> {
    try {
      await this.redis.quit();
    } catch {
      this.redis.disconnect();
    }
  }
}
