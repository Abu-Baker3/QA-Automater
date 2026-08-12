import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RepositoriesService } from './repositories.service';
import { QueueService } from '../queue/queue.service';
import { ConflictException } from '@nestjs/common';

describe('RepositoriesService', () => {
  let service: RepositoriesService;
  let queueService: QueueService;

  beforeEach(() => {
    queueService = new QueueService();
    vi.spyOn(queueService, 'enqueueJob').mockResolvedValue({ job: { id: 'job_123' } } as unknown as { job: Record<string, unknown> });
    service = new RepositoriesService(queueService);
  });

  it('AC1: should register repository and return 202 payload with repository_id, scan_id, and queued status', async () => {
    const orgId = 'org_abc';
    const dto = {
      provider: 'github',
      full_name: 'acme/web-app',
      branch: 'main',
    };

    const result = await service.registerRepository(orgId, dto);

    expect(result.status).toBe('queued');
    expect(result.repository_id).toMatch(/^repo_/);
    expect(result.scan_id).toMatch(/^scan_/);

    expect(queueService.enqueueJob).toHaveBeenCalledWith(
      'repository-scan',
      'initial-scan',
      expect.objectContaining({
        repository_id: result.repository_id,
        scan_id: result.scan_id,
        full_name: 'acme/web-app',
        branch: 'main',
        org_id: orgId,
      }),
    );
  });

  it('AC2: should throw ConflictException (409) if duplicate repository is registered for same org', async () => {
    const orgId = 'org_abc';
    const dto = {
      full_name: 'acme/web-app',
      branch: 'main',
    };

    await service.registerRepository(orgId, dto);

    await expect(service.registerRepository(orgId, dto)).rejects.toThrow(ConflictException);
    await expect(service.registerRepository(orgId, dto)).rejects.toThrow(
      "Repository 'acme/web-app' is already registered for this organization.",
    );
  });

  it('should allow same repository full_name under a different organization', async () => {
    const dto = {
      full_name: 'acme/web-app',
      branch: 'main',
    };

    const res1 = await service.registerRepository('org_1', dto);
    const res2 = await service.registerRepository('org_2', dto);

    expect(res1.repository_id).not.toBe(res2.repository_id);
  });
});
