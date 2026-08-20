import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { GenerationJob } from '@qa-automater/types';
import { GenerationJobsController } from './generation-jobs.controller';
import { GenerationJobsService } from './generation-jobs.service';

const mockJob: GenerationJob = {
  id: 'job_uuid_101',
  story_id: 'story_login_101',
  repository_id: 'repo_main',
  status: 'codegen',
  test_plan_ir: {
    story_id: 'story_login_101',
    title: 'Login Flow',
    steps: [],
  },
  model_versions: {
    story_agent: { provider: 'openai', model: 'gpt-4o' },
    mapping_agent: { provider: 'openai', model: 'gpt-4o' },
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('GenerationJobsController (E9.5)', () => {
  let controller: GenerationJobsController;
  let service: GenerationJobsService;

  beforeEach(() => {
    service = {
      startGeneration: vi.fn().mockResolvedValue({
        job_id: 'job_uuid_101',
        status: 'planning',
      }),
      getJobById: vi.fn().mockResolvedValue(mockJob),
    } as unknown as GenerationJobsService;

    controller = new GenerationJobsController(service);
  });

  it('AC1: POST /stories/:id/generate returns 202 Accepted with job_id and status planning', async () => {
    const res = await controller.startStoryGeneration('story_login_101');

    expect(res.job_id).toBe('job_uuid_101');
    expect(res.status).toBe('planning');
    expect(service.startGeneration).toHaveBeenCalledWith('story_login_101', undefined);
  });

  it('AC1: POST /generate starts generation job and returns 202 Accepted', async () => {
    const res = await controller.startGeneration({ story_id: 'story_login_101' });

    expect(res.job_id).toBe('job_uuid_101');
    expect(res.status).toBe('planning');
    expect(service.startGeneration).toHaveBeenCalledWith('story_login_101', undefined);
  });

  it('AC2: GET /stories/generation-jobs/:id returns stored test_plan_ir & model_versions', async () => {
    const job = await controller.getStoryGenerationJob('job_uuid_101');

    expect(job.id).toBe('job_uuid_101');
    expect(job.status).toBe('codegen');
    expect(job.test_plan_ir?.title).toBe('Login Flow');
    expect(job.model_versions?.story_agent?.model).toBe('gpt-4o');
    expect(service.getJobById).toHaveBeenCalledWith('job_uuid_101');
  });
});
