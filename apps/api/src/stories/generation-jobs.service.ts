import {
  Injectable,
  NotFoundException,
  ConflictException,
  ServiceUnavailableException,
  Optional,
} from '@nestjs/common';

import type {
  ElementSearchResultItem,
  ExportJobRequest,
  ExportJobResponse,
  ExportType,
  GenerationAuditLog,
  GenerationAuditLogResponse,
  GenerationJob,
  OverrideMappingRequest,
  StartGenerationResponse,
  UserStoryDetails,
} from '@qa-automater/types';

import {
  applyMappingOverride,
  buildGenerationAuditLog,
  buildReviewItems,
  createTestZipArchive,
  getPendingReviewItems,
  GenerationJobRunner,
  isExportAllowed,
  PageObjectGenerator,
  S3StorageService,
  verifyTraceabilityChain,
} from '@qa-automater/shared';

import { DatabaseService } from '../database/database.service';
import { LlmService } from '../llm/llm.service';
import { ElementsService } from '../elements/elements.service';
import { GitHubIntegrationService } from '../integrations/github-integration.service';

@Injectable()
export class GenerationJobsService {
  private readonly jobsStore = new Map<string, GenerationJob>();
  private readonly auditLogsStore = new Map<string, GenerationAuditLog>();
  private readonly storageService = new S3StorageService();

  constructor(
    private readonly db: DatabaseService,
    private readonly llmService: LlmService,
    private readonly elementsService: ElementsService,
    @Optional() private readonly githubService?: GitHubIntegrationService,
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
   * Initiates export for a generation job (E10.3 & E12.2).
   * Gates export on review resolution: throws 409 Conflict if pending review items exist.
   * E12.2 AC1 & AC2: Generates ZIP archive containing spec, PO, README, and .env.example with 15-min presigned URL.
   */
  async exportGenerationJob(jobId: string, request?: ExportJobRequest): Promise<ExportJobResponse> {
    const job = await this.getJobById(jobId);
    const pendingSteps = getPendingReviewItems(job);

    if (pendingSteps.length > 0 || !job.export_allowed) {
      throw new ConflictException({
        message: `Export blocked: ${pendingSteps.length} step locator mapping(s) require human review resolution before export.`,
        code: 'EXPORT_BLOCKED_UNRESOLVED_REVIEW_ITEMS',
        pending_steps: pendingSteps,
      });
    }

    const exportType: ExportType = request?.type || request?.export_type || 'zip';
    const orgId = job.repository_id || 'default_org';

    let downloadUrl: string | undefined;
    let expiresAt: string | undefined;
    let artifactKey: string | undefined;
    const expiresInSeconds = Number(process.env.EXPORT_PRESIGNED_EXPIRATION_SECONDS ?? 900); // AC1: valid 15 minutes (900s)

    if (exportType === 'zip') {
      const generator = new PageObjectGenerator();
      const testPlan = job.test_plan_ir || {
        user_story_id: job.story_id || 'story_default',
        title: 'Generated E2E Suite',
        summary: 'Auto-generated e2e Playwright suite',
        steps: [],
      };
      const mappings = job.mappings || [];
      const codegenOutput = generator.generate(testPlan, mappings);

      const zipBuffer = await createTestZipArchive({
        specFiles: [
          {
            filename: codegenOutput.specFile.fileName,
            content: codegenOutput.specFile.content,
          },
        ],
        pageObjectFiles: codegenOutput.pageObjects.map((po) => ({
          filename: po.fileName,
          content: po.content,
        })),
      });

      try {
        const uploadResult = await this.storageService.uploadJobArtifact(
          orgId,
          jobId,
          'tests.zip',
          zipBuffer,
          'application/zip',
        );
        artifactKey = uploadResult.key;

        downloadUrl = await this.storageService.getPresignedDownloadUrl(
          artifactKey,
          expiresInSeconds,
        );
        expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.warn(
          `[GenerationJobsService] S3 storage upload warning for job ${jobId}: ${errorMessage}`,
        );
      }
    }

    let pullRequestUrl: string | undefined;
    let pullRequestNumber: number | undefined;
    let branchName: string | undefined;
    let targetBranch: string | undefined;
    let targetPath: string | undefined;

    if (exportType === 'github_pr') {
      const generator = new PageObjectGenerator();
      const testPlan = job.test_plan_ir || {
        user_story_id: job.story_id || 'story_default',
        title: 'Generated E2E Suite',
        summary: 'Auto-generated e2e Playwright suite',
        steps: [],
      };
      const mappings = job.mappings || [];
      const codegenOutput = generator.generate(testPlan, mappings);

      if (!this.githubService) {
        throw new ServiceUnavailableException(
          'GitHub integration service is currently unavailable for Pull Request export.',
        );
      }

      const prResult = await this.githubService.createPullRequest({
        orgId,
        repositoryId: job.repository_id || 'repo_default',
        jobId,
        targetBranch: request?.target_branch,
        targetPath: request?.target_path,
        specFiles: [
          {
            filename: codegenOutput.specFile.fileName,
            content: codegenOutput.specFile.content,
          },
        ],
        pageObjectFiles: codegenOutput.pageObjects.map((po) => ({
          filename: po.fileName,
          content: po.content,
        })),
      });

      pullRequestUrl = prResult.pull_request_url;
      pullRequestNumber = prResult.pull_request_number;
      branchName = prResult.branch_name;
      targetBranch = prResult.target_branch;
      targetPath = prResult.target_path;
    }

    const updatedJob: GenerationJob = {
      ...job,
      status: 'codegen',
      updated_at: new Date().toISOString(),
    };
    this.jobsStore.set(jobId, updatedJob);

    // Story E12.4 AC1 & AC2: Automatically construct and store generation audit log upon completed export
    const auditLog = buildGenerationAuditLog({
      jobId,
      storyId: job.story_id,
      exportType,
      testPlan: job.test_plan_ir,
      mappings: job.mappings,
      modelVersions: job.model_versions,
    });
    this.auditLogsStore.set(jobId, auditLog);
    this.auditLogsStore.set(auditLog.id, auditLog);

    return {
      job_id: jobId,
      status: 'codegen',
      message: `Export type '${exportType}' processed successfully.`,
      export_allowed: true,
      export_type: exportType,
      download_url: downloadUrl,
      expires_in_seconds: downloadUrl ? expiresInSeconds : undefined,
      expires_at: expiresAt,
      artifact_key: artifactKey,
      pull_request_url: pullRequestUrl,
      pull_request_number: pullRequestNumber,
      branch_name: branchName,
      target_branch: targetBranch,
      target_path: targetPath,
    };
  }

  /**
   * Story E12.4 AC1 & AC2: Retrieves generation audit log and validates source_ref chain traceability.
   */
  async getGenerationAuditLog(jobId: string): Promise<GenerationAuditLogResponse> {
    let auditLog = this.auditLogsStore.get(jobId);

    if (!auditLog) {
      const job = this.jobsStore.get(jobId);
      if (!job) {
        throw new NotFoundException(`Generation job or audit log with ID '${jobId}' not found.`);
      }

      auditLog = buildGenerationAuditLog({
        jobId: job.id,
        storyId: job.story_id,
        exportType: 'zip',
        testPlan: job.test_plan_ir,
        mappings: job.mappings,
        modelVersions: job.model_versions,
      });
      this.auditLogsStore.set(jobId, auditLog);
    }

    const intact = verifyTraceabilityChain(auditLog);

    return {
      audit_log: auditLog,
      job_id: jobId,
      traceability_chain_intact: intact,
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
