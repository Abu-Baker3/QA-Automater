import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  ElementSearchResultItem,
  GenerationJob,
  GenerationJobStatus,
  ModelVersions,
  StartGenerationResponse,
  StepLocatorMapping,
  TestPlanIR,
  UserStoryDetails,
} from '@qa-automater/types';
import { GenerationJobRunner } from '@qa-automater/shared';
import { DatabaseService } from '../database/database.service';
import { LlmService } from '../llm/llm.service';
import { ElementsService } from '../elements/elements.service';

const STATUS_MAP_TO_PRISMA: Record<
  GenerationJobStatus,
  'PLANNING' | 'MAPPING' | 'REVIEW' | 'CODEGEN' | 'COMPLETED' | 'FAILED'
> = {
  planning: 'PLANNING',
  mapping: 'MAPPING',
  review: 'REVIEW',
  codegen: 'CODEGEN',
  completed: 'COMPLETED',
  failed: 'FAILED',
};

const STATUS_MAP_FROM_PRISMA: Record<string, GenerationJobStatus> = {
  PLANNING: 'planning',
  MAPPING: 'mapping',
  REVIEW: 'review',
  CODEGEN: 'codegen',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

@Injectable()
export class GenerationJobsService {
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
    const repositoryId = userStory?.repository_id;

    const job = await this.db.generationJob.create({
      data: {
        storyId,
        repositoryId,
        status: 'PLANNING',
      },
    });

    const story: UserStoryDetails = userStory || {
      id: storyId,
      title: `User Story ${storyId}`,
      description: `Test automation for story ${storyId}`,
      repository_id: repositoryId,
    };

    // Run pipeline asynchronously in background
    void this.executeJobPipeline(job.id, story);

    return {
      job_id: job.id,
      status: 'planning',
    };
  }

  /**
   * Queries job state by ID (AC2: returns test_plan_ir and model_versions).
   */
  async getJobById(jobId: string): Promise<GenerationJob> {
    const job = await this.db.generationJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Generation job with ID '${jobId}' not found`);
    }

    return {
      id: job.id,
      story_id: job.storyId,
      repository_id: job.repositoryId || undefined,
      status: STATUS_MAP_FROM_PRISMA[job.status] || 'planning',
      test_plan_ir: (job.testPlanIr as unknown as TestPlanIR) || undefined,
      mappings: (job.mappings as unknown as StepLocatorMapping[]) || undefined,
      model_versions: (job.modelVersions as unknown as ModelVersions) || undefined,
      error_message: job.errorMessage || undefined,
      created_at: job.createdAt.toISOString(),
      updated_at: job.updatedAt.toISOString(),
      completed_at: job.completedAt ? job.completedAt.toISOString() : undefined,
    };
  }

  private async executeJobPipeline(jobId: string, story: UserStoryDetails): Promise<void> {
    const runner = new GenerationJobRunner(this.llmService);

    const candidateResolver = async (stepDescription: string, pageHint?: string) => {
      const results = await this.elementsService.searchElements({
        query: stepDescription,
        page_route: pageHint,
        repository_id: story.repository_id,
        limit: 100,
      });

      return results.map(
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
      const data: Record<string, unknown> = {};

      if (partial.status) {
        data.status = STATUS_MAP_TO_PRISMA[partial.status];
      }
      if (partial.testPlanIr) {
        data.testPlanIr = partial.testPlanIr as unknown as object;
      }
      if (partial.mappings) {
        data.mappings = partial.mappings as unknown as object;
      }
      if (partial.modelVersions) {
        data.modelVersions = partial.modelVersions as unknown as object;
      }
      if (partial.errorMessage) {
        data.errorMessage = partial.errorMessage;
      }
      if (partial.completedAt) {
        data.completedAt = partial.completedAt;
      }

      await this.db.generationJob.update({
        where: { id: jobId },
        data,
      });
    });
  }
}
