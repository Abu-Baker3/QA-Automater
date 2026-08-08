import { Queue, Worker, JobsOptions, Processor, ConnectionOptions } from 'bullmq';
import Redis from 'ioredis';

export enum QueueName {
  SCAN = 'scan-jobs',
  AI = 'ai-jobs',
  EXPORT = 'export-jobs',
}

export interface RedisOptions {
  host?: string;
  port?: number;
  password?: string;
  url?: string;
  maxRetriesPerRequest?: number | null;
}

export interface StandaloneRedisConfig {
  host: string;
  port: number;
  password?: string;
  maxRetriesPerRequest?: number | null;
  tls?: Record<string, unknown>;
}

export function getRedisConnectionConfig(customOpts?: RedisOptions): StandaloneRedisConfig {
  const url = customOpts?.url || process.env.REDIS_URL;
  const useTls =
    (url && url.startsWith('rediss://')) ||
    process.env.REDIS_TLS === 'true' ||
    Boolean(process.env.REDIS_USE_TLS);

  if (url && !customOpts?.host) {
    try {
      const parsed = new URL(url);
      return {
        host: parsed.hostname || 'localhost',
        port: parsed.port ? parseInt(parsed.port, 10) : 6379,
        password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
        maxRetriesPerRequest: customOpts?.maxRetriesPerRequest ?? null,
        ...(useTls ? { tls: {} } : {}),
      };
    } catch {
      // Fallback if URL parsing fails
    }
  }

  return {
    host: customOpts?.host || process.env.REDIS_HOST || 'localhost',
    port: customOpts?.port || (process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379),
    password: customOpts?.password || process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: customOpts?.maxRetriesPerRequest ?? null,
    ...(useTls ? { tls: {} } : {}),
  };
}

export function createRedisClient(customOpts?: RedisOptions): Redis {
  const config = getRedisConnectionConfig(customOpts);
  const client = new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    maxRetriesPerRequest: config.maxRetriesPerRequest,
    ...(config.tls ? { tls: config.tls } : {}),
  });

  // Attach default error listener to prevent unhandled EventEmitter error crashes
  client.on('error', () => {});

  return client;
}

export async function pingRedis(customOpts?: RedisOptions): Promise<boolean> {
  const redis = createRedisClient(customOpts);
  try {
    const res = await redis.ping();
    return res === 'PONG';
  } catch {
    return false;
  } finally {
    try {
      redis.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
}

export class QueueService {
  private queues: Map<string, Queue> = new Map();

  getQueue<T = unknown>(queueName: QueueName | string, customRedisOpts?: RedisOptions): Queue<T> {
    if (!this.queues.has(queueName)) {
      const connection = getRedisConnectionConfig(customRedisOpts) as ConnectionOptions;
      const queue = new Queue<T>(queueName, { connection });
      this.queues.set(queueName, queue as Queue);
    }
    return this.queues.get(queueName) as Queue<T>;
  }

  async enqueueJob<T = Record<string, unknown>>(
    queueName: QueueName | string,
    jobName: string,
    data: T,
    opts?: JobsOptions,
    customRedisOpts?: RedisOptions,
  ) {
    const queue = this.getQueue<T>(queueName, customRedisOpts);
    return (queue.add as unknown as (name: string, data: T, opts?: JobsOptions) => Promise<unknown>)(
      jobName,
      data,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
        ...opts,
      },
    );
  }

  async closeAll(): Promise<void> {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    this.queues.clear();
  }
}

export function createWorker<T = unknown, R = unknown>(
  queueName: QueueName | string,
  processor: Processor<T, R>,
  customRedisOpts?: RedisOptions,
): Worker<T, R> {
  const connection = getRedisConnectionConfig(customRedisOpts) as ConnectionOptions;
  return new Worker<T, R>(queueName, processor, { connection });
}
