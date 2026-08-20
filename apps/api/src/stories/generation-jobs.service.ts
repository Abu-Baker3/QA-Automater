import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  ElementSearchResultItem,
  GenerationJob,
  StartGenerationResponse,
  UserStoryDetails,
} from '@qa-automater/types';
import { GenerationJobRunner } from '@qa-automater/shared';
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

  private async executeJobPipeline(jobId: string, story: UserStoryDetails): Promise<void> {
    const runner = new GenerationJobRunner(this.llmService);

    const candidateResolver = async (stepDescription: string, pageHint?: string) => {
      const response = await this.elementsService.searchElements({
        q: stepDescription,
        page_route: pageHint,
        repository_id: story.repository_id,
        limit: 100,
      });

      return (response.items || []).map(
        (item) =>
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

      const updated: GenerationJob = {
        ...existing,
        status: partial.status || existing.status,
        test_plan_ir: partial.testPlanIr || existing.test_plan_ir,
        mappings: partial.mappings || existing.mappings,
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
