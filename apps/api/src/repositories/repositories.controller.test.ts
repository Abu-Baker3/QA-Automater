import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RepositoriesController } from './repositories.controller';
import { RepositoriesService } from './repositories.service';
import { QueueService } from '../queue/queue.service';
import { ConflictException } from '@nestjs/common';

describe('RepositoriesController', () => {
  let controller: RepositoriesController;
  let service: RepositoriesService;
  let queueService: QueueService;

  beforeEach(() => {
    queueService = new QueueService();
    vi.spyOn(queueService, 'enqueueJob').mockResolvedValue({ job: { id: 'job_999' } } as unknown as { job: Record<string, unknown> });
    service = new RepositoriesService(queueService);
    controller = new RepositoriesController(service);
  });

  it('AC1: should return HTTP 202 payload with repository_id, scan_id, and status queued', async () => {
    const res = await controller.registerRepository(
      { full_name: 'acme/web-app', branch: 'main', provider: 'github' },
      'org_123',
    );

    expect(res.status).toBe('queued');
    expect(res.repository_id).toMatch(/^repo_/);
    expect(res.scan_id).toMatch(/^scan_/);
  });

  it('AC2: should throw ConflictException if registering duplicate repository under same org', async () => {
    await controller.registerRepository(
      { full_name: 'acme/web-app', branch: 'main' },
      'org_123',
    );

    await expect(
      controller.registerRepository(
        { full_name: 'acme/web-app', branch: 'main' },
        'org_123',
      ),
    ).rejects.toThrow(ConflictException);
  });
});
