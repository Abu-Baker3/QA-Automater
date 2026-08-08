import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { QueueService as SharedQueueService, QueueName, pingRedis } from '@qa-automater/shared';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private sharedQueueService = new SharedQueueService();

  async enqueueJob<T = Record<string, unknown>>(
    queueName: QueueName | string,
    jobName: string,
    data: T,
  ) {
    return this.sharedQueueService.enqueueJob(queueName, jobName, data);
  }

  async checkHealth(): Promise<{ ok: boolean; redis: string }> {
    const isAlive = await pingRedis();
    return {
      ok: isAlive,
      redis: isAlive ? 'connected' : 'disconnected',
    };
  }

  async onModuleDestroy() {
    await this.sharedQueueService.closeAll();
  }
}
