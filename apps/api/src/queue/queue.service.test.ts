import { describe, expect, it } from 'vitest';
import { QueueService } from './queue.service';

describe('QueueService in API app', () => {
  it('instantiates and provides queue enqueuing interface', () => {
    const queueService = new QueueService();
    expect(queueService.enqueueJob).toBeDefined();
    expect(queueService.checkHealth).toBeDefined();
  });
});
