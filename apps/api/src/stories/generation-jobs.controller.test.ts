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
    user_story_id: 'story_login_101',
    title: 'Login Flow',
    summary: 'Login flow test plan',
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
      overrideMapping: vi.fn().mockResolvedValue(mockJob),
      exportGenerationJob: vi.fn().mockResolvedValue({
        job_id: 'job_uuid_101',
        status: 'codegen',
        message: 'Export initiated successfully.',
        export_allowed: true,
      }),
      getGenerationAuditLog: vi.fn(),
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

  it('E10.1 AC1 & AC2: GET /stories/generation-jobs/:id returns review_items and export_allowed status', async () => {
    const reviewJob: GenerationJob = {
      ...mockJob,
      status: 'review',
      review_items: [
        {
          step_id: 'step_1',
          step_order: 1,
          action: 'fill',
          target_description: 'Enter email',
          confidence: 0.65,
          element_id: 'elem_email',
          chosen_locator: null,
          candidates: [],
          rationale: 'Low confidence match',
          needs_review: true,
          human_verified: false,
        },
      ],
      export_allowed: false,
    };
    vi.mocked(service.getJobById).mockResolvedValueOnce(reviewJob);

    const job = await controller.getStoryGenerationJob('job_uuid_101');

    expect(job.status).toBe('review');
    expect(job.review_items).toHaveLength(1);
    expect(job.review_items?.[0]?.step_order).toBe(1);
    expect(job.review_items?.[0]?.confidence).toBe(0.65);
    expect(job.export_allowed).toBe(false);
  });

  it('E10.2 AC1 & AC2: PATCH /stories/generation-jobs/:id/mappings/:stepOrder overrides mapping confidence to 1.0', async () => {
    const overriddenJob: GenerationJob = {
      ...mockJob,
      status: 'codegen',
      export_allowed: true,
    };
    vi.mocked(service.overrideMapping).mockResolvedValueOnce(overriddenJob);

    const result = await controller.overrideStoryJobMapping('job_uuid_101', '1', {
      element_id: 'elem_email_override',
    });

    expect(result.status).toBe('codegen');
    expect(result.export_allowed).toBe(true);
    expect(service.overrideMapping).toHaveBeenCalledWith('job_uuid_101', 1, {
      element_id: 'elem_email_override',
    });
  });

  it('E10.3 AC2: POST /stories/generation-jobs/:id/export proceeds to codegen when all mappings are resolved', async () => {
    const res = await controller.exportStoryJob('job_uuid_101');

    expect(res.job_id).toBe('job_uuid_101');
    expect(res.status).toBe('codegen');
    expect(res.export_allowed).toBe(true);
    expect(service.exportGenerationJob).toHaveBeenCalledWith('job_uuid_101', undefined);
  });

  it('E12.2 AC1 & AC2: POST /generation-jobs/:id/export with type zip returns 15-minute presigned download URL', async () => {
    vi.mocked(service.exportGenerationJob).mockResolvedValueOnce({
      job_id: 'job_uuid_101',
      status: 'codegen',
      message: "Export type 'zip' processed successfully.",
      export_allowed: true,
      export_type: 'zip',
      download_url:
        'https://s3.amazonaws.com/bucket/exports/job_uuid_101/tests.zip?X-Amz-Expires=900',
      expires_in_seconds: 900,
      expires_at: new Date(Date.now() + 900 * 1000).toISOString(),
      artifact_key: 'exports/job_uuid_101/tests.zip',
    });

    const res = await controller.exportJob('job_uuid_101', { type: 'zip' });

    expect(res.job_id).toBe('job_uuid_101');
    expect(res.export_type).toBe('zip');
    expect(res.expires_in_seconds).toBe(900);
    expect(res.download_url).toContain('X-Amz-Expires=900');
    expect(service.exportGenerationJob).toHaveBeenCalledWith('job_uuid_101', { type: 'zip' });
  });

  it('E12.3 AC1 & AC2: POST /generation-jobs/:id/export with type github_pr creates PR and returns PR metadata', async () => {
    vi.mocked(service.exportGenerationJob).mockResolvedValueOnce({
      job_id: 'job_uuid_101',
      status: 'codegen',
      message: "Export type 'github_pr' processed successfully.",
      export_allowed: true,
      export_type: 'github_pr',
      pull_request_url: 'https://github.com/acme/web-app/pull/142',
      pull_request_number: 142,
      branch_name: 'qa-automater/tests-job_uuid_101',
      target_branch: 'main',
      target_path: 'tests/e2e',
    });

    const res = await controller.exportJob('job_uuid_101', {
      type: 'github_pr',
      target_branch: 'main',
      target_path: 'tests/e2e',
    });

    expect(res.job_id).toBe('job_uuid_101');
    expect(res.export_type).toBe('github_pr');
    expect(res.pull_request_url).toBe('https://github.com/acme/web-app/pull/142');
    expect(res.pull_request_number).toBe(142);
    expect(res.branch_name).toBe('qa-automater/tests-job_uuid_101');
    expect(res.target_branch).toBe('main');
    expect(res.target_path).toBe('tests/e2e');
    expect(service.exportGenerationJob).toHaveBeenCalledWith('job_uuid_101', {
      type: 'github_pr',
      target_branch: 'main',
      target_path: 'tests/e2e',
    });
  });

  it('E12.4 AC1 & AC2: GET /stories/generation-jobs/:id/audit returns audit log and intact source_ref chain', async () => {
    vi.mocked(service.getGenerationAuditLog).mockResolvedValueOnce({
      job_id: 'job_uuid_101',
      traceability_chain_intact: true,
      audit_log: {
        id: 'audit_888',
        job_id: 'job_uuid_101',
        story_id: 'story_auth',
        user_id: 'usr_qa_lead_1',
        export_type: 'zip',
        story_text: 'User Story: Login Flow',
        mappings: [],
        model_versions: {
          story_agent: { provider: 'google', model: 'gemini-2.5-flash' },
          mapping_agent: { provider: 'google', model: 'gemini-2.5-flash' },
        },
        source_ref_chain: [
          {
            story_id: 'story_auth',
            story_title: 'Login Flow',
            step_id: 'step_1',
            step_order: 1,
            step_action: 'Enter Username',
            locator_id: 'input_user',
            file_path: 'apps/web/src/Login.tsx',
            line_number: 25,
            source_ref:
              'story:story_auth -> step:1 (Enter Username) -> locator:input_user -> file:apps/web/src/Login.tsx:25',
          },
        ],
        export_timestamp: new Date().toISOString(),
      },
    });

    const res = await controller.getStoryJobAudit('job_uuid_101');

    expect(res.job_id).toBe('job_uuid_101');
    expect(res.traceability_chain_intact).toBe(true);
    expect(res.audit_log.story_text).toBe('User Story: Login Flow');
    expect(res.audit_log.model_versions.story_agent?.model).toBe('gemini-2.5-flash');
    expect(res.audit_log.source_ref_chain[0]?.source_ref).toContain('story:story_auth');
    expect(service.getGenerationAuditLog).toHaveBeenCalledWith('job_uuid_101');
  });

  it('E14.1 AC1: passes story and triggers generation job through rate-limited service flow', async () => {
    const res = await controller.startStoryGeneration('story_101', {
      user_story: {
        id: 'story_101',
        title: 'Title',
        description: 'Desc',
        organization_id: 'org_acme',
      },
    });

    expect(res.job_id).toBe('job_uuid_101');
    expect(res.status).toBe('planning');
    expect(service.startGeneration).toHaveBeenCalledWith(
      'story_101',
      expect.objectContaining({ organization_id: 'org_acme' }),
    );
  });
});
