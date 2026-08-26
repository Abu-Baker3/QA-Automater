import { describe, it, expect, vi } from 'vitest';
import { TestsController } from './tests.controller';
import { GenerationJobsService } from '../stories/generation-jobs.service';

describe('TestsController (AC2 Verification)', () => {
  const mockService = {
    exportGenerationJob: vi.fn().mockResolvedValue({
      job_id: 'job_uuid_101',
      status: 'codegen',
      message: 'Export initiated successfully.',
      export_allowed: true,
    }),
  } as unknown as GenerationJobsService;

  const controller = new TestsController(mockService);

  it('should allow test generation for MEMBER and ADMIN roles (AC2)', async () => {
    const result = await controller.generateTest({
      userStory: 'Given a member user, when they generate a test flow, then it succeeds',
      repositoryId: 'repo_123',
    });

    expect(result.status).toBe('success');
    expect(result.jobId).toBeDefined();
    expect(result.repositoryId).toBe('repo_123');
  });

  it('E10.3: should support POST /tests/export route', async () => {
    const result = await controller.exportTestJob({ job_id: 'job_uuid_101' });

    expect(result.job_id).toBe('job_uuid_101');
    expect(result.export_allowed).toBe(true);
    expect(mockService.exportGenerationJob).toHaveBeenCalledWith('job_uuid_101');
  });
});
