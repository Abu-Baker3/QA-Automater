import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { QueueService as SharedQueueService } from '@qa-automater/shared';
import { NotFoundException } from '@nestjs/common';

describe('QueueController', () => {
  let controller: QueueController;
  let service: QueueService;
  let mockSharedQueue: SharedQueueService;

  beforeEach(() => {
    mockSharedQueue = new SharedQueueService();
    vi.spyOn(mockSharedQueue, 'enqueueJob').mockResolvedValue({
      job: { id: 'job_999' },
    } as unknown as { job: Record<string, unknown> });
    service = new QueueService();
    service.sharedQueueService = mockSharedQueue;
    controller = new QueueController(service);
  });

  it('AC1: POST /queue/scan should enqueue scan job and return 202 payload with status queued', async () => {
    const dto = {
      repository_id: 'repo_999',
      full_name: 'acme/web-app',
      branch: 'main',
    };

    const res = await controller.enqueueScan(dto, 'org_test');

    expect(res.status).toBe('queued');
    expect(res.job_id).toMatch(/^job_scan_/);
    expect(res.attempts_max).toBe(3);
  });

  it('AC2: GET /queue/scan/:jobId should return job status and retry metadata', async () => {
    const dto = {
      repository_id: 'repo_888',
      full_name: 'acme/service',
      branch: 'main',
    };

    const enqueued = await controller.enqueueScan(dto, 'org_test');
    const jobStatus = await controller.getScanStatus(enqueued.job_id);

    expect(jobStatus.job_id).toBe(enqueued.job_id);
    expect(jobStatus.status).toBe('queued');
    expect(jobStatus.attempts_max).toBe(3);
  });

  it('GET /queue/scan/:jobId should throw NotFoundException for unknown jobId', async () => {
    await expect(controller.getScanStatus('job_invalid')).rejects.toThrow(NotFoundException);
  });
});
