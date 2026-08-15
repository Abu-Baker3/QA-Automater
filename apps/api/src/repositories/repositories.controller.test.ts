import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RepositoriesController } from './repositories.controller';
import { RepositoriesService } from './repositories.service';
import { QueueService } from '../queue/queue.service';
import { SecretsManagerService } from '../integrations/secrets-manager.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('RepositoriesController', () => {
  let controller: RepositoriesController;
  let service: RepositoriesService;
  let queueService: QueueService;
  let secretsManager: SecretsManagerService;

  beforeEach(() => {
    queueService = new QueueService();
    secretsManager = new SecretsManagerService();
    vi.spyOn(queueService, 'enqueueJob').mockResolvedValue({
      job: { id: 'job_999' },
    } as unknown as { job: Record<string, unknown> });
    service = new RepositoriesService(queueService, secretsManager);
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
    await controller.registerRepository({ full_name: 'acme/web-app', branch: 'main' }, 'org_123');

    await expect(
      controller.registerRepository({ full_name: 'acme/web-app', branch: 'main' }, 'org_123'),
    ).rejects.toThrow(ConflictException);
  });

  it('AC1 & AC2: disconnectRepository should return HTTP 200 payload with disconnected status', async () => {
    const regRes = await controller.registerRepository(
      { full_name: 'acme/web-app', branch: 'main' },
      'org_123',
    );

    const discRes = await controller.disconnectRepository(regRes.repository_id, 'org_123');

    expect(discRes.status).toBe('disconnected');
    expect(discRes.repository_id).toBe(regRes.repository_id);
    expect(discRes.s3_purge_scheduled).toBe(true);
    expect(discRes.token_revoked).toBe(true);
  });

  it('disconnectRepository should throw NotFoundException (404) for nonexistent repository', async () => {
    await expect(controller.disconnectRepository('repo_missing', 'org_123')).rejects.toThrow(
      NotFoundException,
    );
  });

  describe('E7.2: GET /repositories/:id/pages', () => {
    it('AC1: should return paginated list of pages with route_path and element_count', async () => {
      const regRes = await controller.registerRepository(
        { full_name: 'acme/ui-app', branch: 'main' },
        'org_123',
      );

      const res = await controller.listRepositoryPages(
        regRes.repository_id,
        undefined,
        undefined,
        '1',
        '10',
        'org_123',
      );

      expect(res.data.length).toBeGreaterThan(0);
      expect(res.pagination.total).toBe(4);
      expect(res.pagination.page).toBe(1);
      expect(res.pagination.limit).toBe(10);
      expect(res.data[0]).toHaveProperty('route_path');
      expect(res.data[0]).toHaveProperty('element_count');
      expect(typeof res.data[0]!.element_count).toBe('number');
    });

    it('AC2: should filter pages matching route search query', async () => {
      const regRes = await controller.registerRepository(
        { full_name: 'acme/ui-app-2', branch: 'main' },
        'org_123',
      );

      const res = await controller.listRepositoryPages(
        regRes.repository_id,
        'login',
        undefined,
        '1',
        '10',
        'org_123',
      );

      expect(res.data.length).toBe(1);
      expect(res.data[0]!.route_path).toBe('/login');
      expect(res.data[0]!.component_name).toBe('LoginPage');
      expect(res.pagination.total).toBe(1);
    });
  });
});
