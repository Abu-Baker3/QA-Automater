import { describe, it, expect } from 'vitest';
import { getRedisConnectionConfig, QueueName, QueueService } from './index';

describe('Redis & BullMQ Queue Integration (AC-1)', () => {
  it('parses REDIS_URL correctly when provided', () => {
    const config = getRedisConnectionConfig({
      url: 'redis://:my-secret-pass@cache.internal:6380',
    });
    expect(config.host).toBe('cache.internal');
    expect(config.port).toBe(6380);
    expect(config.password).toBe('my-secret-pass');
  });

  it('parses rediss:// URL and enables TLS config', () => {
    const config = getRedisConnectionConfig({
      url: 'rediss://:my-secret-pass@cache.internal:6380',
    });
    expect(config.host).toBe('cache.internal');
    expect(config.port).toBe(6380);
    expect(config.password).toBe('my-secret-pass');
    expect(config.tls).toEqual({});
  });

  it('handles malformed REDIS_URL gracefully without throwing', () => {
    const config = getRedisConnectionConfig({
      url: 'invalid-url-format',
    });
    expect(config.host).toBe('localhost');
    expect(config.port).toBe(6379);
  });

  it('uses default host and port if REDIS_URL is not set', () => {
    const config = getRedisConnectionConfig({});
    expect(config.host).toBe('localhost');
    expect(config.port).toBe(6379);
  });

  it('instantiates QueueService and retrieves typed Queue instance', () => {
    const queueService = new QueueService();
    const scanQueue = queueService.getQueue(QueueName.SCAN);
    expect(scanQueue).toBeDefined();
    expect(scanQueue.name).toBe(QueueName.SCAN);
  });
});
