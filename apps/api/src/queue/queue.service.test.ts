import { describe, expect, it, beforeEach, vi } from 'vitest';
import { QueueService } from './queue.service';
import { QueueService as SharedQueueService } from '@qa-automater/shared';
import { NotFoundException } from '@nestjs/common';

describe('QueueService in API app', () => {
  let queueService: QueueService;
  let mockSharedQueue: SharedQueueService;

  beforeEach(() => {
    mockSharedQueue = new SharedQueueService();
    vi.spyOn(mockSharedQueue, 'enqueueJob').mockResolvedValue({
      job: { id: 'job_123' },
    } as unknown as { job: Record<string, unknown> });
    queueService = new QueueService(mockSharedQueue);
  });

  it('instantiates and provides queue enqueuing interface', () => {
    expect(queueService.enqueueJob).toBeDefined();
    expect(queueService.checkHealth).toBeDefined();
  });

  it('AC1: should enqueue scan job and return queued status with 3 max attempts', async () => {
    const dto = {
      repository_id: 'repo_123',
      full_name: 'acme/web-app',
      branch: 'main',
      org_id: 'org_abc',
    };

    const res = await queueService.enqueueScanJob(dto);

    expect(res.status).toBe('queued');
    expect(res.job_id).toMatch(/^job_scan_/);
    expect(res.repository_id).toBe('repo_123');
    expect(res.attempts_max).toBe(3);
  });

  it('AC2: should retrieve scan job status with attempt metadata', async () => {
    const dto = {
      repository_id: 'repo_456',
      full_name: 'acme/api-service',
      branch: 'main',
      org_id: 'org_abc',
    };

    const enqueued = await queueService.enqueueScanJob(dto);
    const statusRecord = await queueService.getScanJobStatus(enqueued.job_id);

    expect(statusRecord.job_id).toBe(enqueued.job_id);
    expect(statusRecord.status).toBe('queued');
    expect(statusRecord.attempts_max).toBe(3);
    expect(statusRecord.attempts_made).toBe(0);
  });

  it('should throw NotFoundException for invalid scan job_id', async () => {
    await expect(queueService.getScanJobStatus('job_nonexistent')).rejects.toThrow(
      NotFoundException,
    );
  });
});
