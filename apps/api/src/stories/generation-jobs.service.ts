import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import type {
  ElementSearchResultItem,
  ExportJobResponse,
  GenerationJob,
  OverrideMappingRequest,
  StartGenerationResponse,
  UserStoryDetails,
} from '@qa-automater/types';

import {
  applyMappingOverride,
  buildReviewItems,
  getPendingReviewItems,
  GenerationJobRunner,
  isExportAllowed,
} from '@qa-automater/shared';

import { DatabaseService } from '../database/database.service';
import { LlmService } from '../llm/llm.service';
import { ElementsService } from '../elements/elements.service';

@Injectable()
export class GenerationJobsService {
  private readonly jobsStore = new Map<string, GenerationJob>();

  constructor(
    private readonly db: DatabaseService,
    private readonly llmService: LlmService,
    private readonly elementsService: ElementsService,
  ) {}

  /**
   * Starts an asynchronous generation job (AC1: returns 202 Accepted with job_id and status 'planning').
   */
  async startGeneration(
    storyId: string,
    userStory?: UserStoryDetails,
  ): Promise<StartGenerationResponse> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const repositoryId = userStory?.repository_id || 'repo_default';

    const newJob: GenerationJob = {
      id: jobId,
      story_id: storyId,
      repository_id: repositoryId,
      status: 'planning',
      created_at: now,
      updated_at: now,
    };

    this.jobsStore.set(jobId, newJob);

    const story: UserStoryDetails = userStory || {
      id: storyId,
      title: `User Story ${storyId}`,
      description: `Test automation for story ${storyId}`,
      repository_id: repositoryId,
    };

    // Run pipeline asynchronously in background
    void this.executeJobPipeline(jobId, story);

    return {
      job_id: jobId,
      status: 'planning',
    };
  }

  /**
   * Queries job state by ID (AC2: returns test_plan_ir and model_versions).
   */
  async getJobById(jobId: string): Promise<GenerationJob> {
    const job = this.jobsStore.get(jobId);

    if (!job) {
      throw new NotFoundException(`Generation job with ID '${jobId}' not found`);
    }

    return job;
  }

  /**
   * Overrides mapping for a specific step_order (E10.2).
   * Sets confidence = 1.0, human_verified = true, and unlocks codegen when export_allowed = true.
   */
  async overrideMapping(
    jobId: string,
    stepOrder: number,
    override: OverrideMappingRequest,
  ): Promise<GenerationJob> {
    const job = await this.getJobById(jobId);
    const updatedJob = applyMappingOverride(job, stepOrder, override);
    this.jobsStore.set(jobId, updatedJob);
    return updatedJob;
  }

  /**
   * Initiates export for a generation job (E10.3).
   * Gates export on review resolution: throws 409 Conflict if pending review items exist.
   */
  async exportGenerationJob(jobId: string): Promise<ExportJobResponse> {
    const job = await this.getJobById(jobId);
    const pendingSteps = getPendingReviewItems(job);

    if (pendingSteps.length > 0 || !job.export_allowed) {
      throw new ConflictException({
        message: `Export blocked: ${pendingSteps.length} step locator mapping(s) require human review resolution before export.`,
        code: 'EXPORT_BLOCKED_UNRESOLVED_REVIEW_ITEMS',
        pending_steps: pendingSteps,
      });
    }

    const updatedJob: GenerationJob = {
      ...job,
      status: 'codegen',
      updated_at: new Date().toISOString(),
    };
    this.jobsStore.set(jobId, updatedJob);

    return {
      job_id: jobId,
      status: 'codegen',
      message: 'Export initiated successfully.',
      export_allowed: true,
    };
  }

  private async executeJobPipeline(jobId: string, story: UserStoryDetails): Promise<void> {
    const runner = new GenerationJobRunner(this.llmService);

    const candidateResolver = async (stepDescription: string, pageHint?: string) => {
      const response = await this.elementsService.searchElements({
        q: stepDescription,
        page_route: pageHint,
        repository_id: story.repository_id,
        limit: 100,
      });

      return (response.data || []).map(
        (item: ElementSearchResultItem) =>
          ({
            id: item.id,
            scan_id: item.scan_id,
            repository_id: item.repository_id,
            route_path: item.route_path,
            tag_name: item.tag_name,
            text_content: item.text_content,
            source_ref: item.source_ref,
            stability_tier: item.stability_tier,
            relevance_score: item.relevance_score,
            primary_candidate: item.primary_candidate,
            candidates: item.candidates,
          }) as ElementSearchResultItem,
      );
    };

    await runner.runPipeline(jobId, story, candidateResolver, async (partial) => {
      const existing = this.jobsStore.get(jobId);
      if (!existing) return;

      const testPlanIr = partial.testPlanIr || existing.test_plan_ir;
      const mappings = partial.mappings || existing.mappings;
      const reviewItems = buildReviewItems(testPlanIr, mappings);
      const exportAllowed = isExportAllowed(mappings);

      const updated: GenerationJob = {
        ...existing,
        status: partial.status || existing.status,
        test_plan_ir: testPlanIr,
        mappings,
        review_items: reviewItems,
        export_allowed: exportAllowed,
        model_versions: partial.modelVersions || existing.model_versions,
        error_message: partial.errorMessage || existing.error_message,
        completed_at: partial.completedAt
          ? partial.completedAt.toISOString()
          : existing.completed_at,
        updated_at: new Date().toISOString(),
      };

      this.jobsStore.set(jobId, updated);
    });
  }
}
