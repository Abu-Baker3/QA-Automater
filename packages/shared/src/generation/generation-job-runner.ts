import type {
  ElementSearchResultItem,
  GenerationJobStatus,
  ModelVersions,
  StepLocatorMapping,
  TestPlanIR,
  UserStoryDetails,
} from '@qa-automater/types';
import { ILLMProvider } from '../llm/types';
import { StoryAgent } from '../llm/story-agent';
import { MappingAgent } from '../llm/mapping-agent';

export interface GenerationJobState {
  id: string;
  storyId: string;
  repositoryId?: string;
  status: GenerationJobStatus;
  testPlanIr?: TestPlanIR;
  mappings?: StepLocatorMapping[];
  modelVersions?: ModelVersions;
  errorMessage?: string;
  completedAt?: Date;
}

export type CandidateResolver = (
  stepDescription: string,
  pageHint?: string,
) => Promise<ElementSearchResultItem[]>;

export class GenerationJobRunner {
  private readonly provider: ILLMProvider;
  private readonly storyAgent: StoryAgent;
  private readonly mappingAgent: MappingAgent;

  constructor(provider: ILLMProvider) {
    this.provider = provider;
    this.storyAgent = new StoryAgent(provider);
    this.mappingAgent = new MappingAgent(provider);
  }

  /**
   * Executes full generation pipeline from Planning (Story Agent) to Mapping (Hybrid RAG + Mapping Agent),
   * updating state and returning final GenerationJobState.
   */
  async runPipeline(
    jobId: string,
    story: UserStoryDetails,
    candidateResolver: CandidateResolver,
    onStateChange?: (state: Partial<GenerationJobState>) => Promise<void>,
  ): Promise<GenerationJobState> {
    const timestamp = new Date().toISOString();
    const storyPromptInfo = this.storyAgent.getPromptInfo(story);
    const mappingPromptInfo = this.mappingAgent.getPromptInfo();

    const modelVersions: ModelVersions = {
      story_agent: {
        provider: this.provider.name,
        model: this.provider.model,
        prompt_version: storyPromptInfo.version,
        prompt_hash: storyPromptInfo.prompt_hash,
        timestamp,
      },
      mapping_agent: {
        provider: this.provider.name,
        model: this.provider.model,
        prompt_version: mappingPromptInfo.version,
        prompt_hash: mappingPromptInfo.prompt_hash,
        timestamp,
      },
    };

    const currentState: GenerationJobState = {
      id: jobId,
      storyId: story.id,
      repositoryId: story.repository_id,
      status: 'planning',
      modelVersions,
    };

    try {
      if (onStateChange) {
        await onStateChange({ status: 'planning', modelVersions });
      }

      // Step 1: Planning Phase — Story Agent decomposition
      const decomposition = await this.storyAgent.decomposeStory(story);
      const testPlanIr = decomposition.test_plan;
      currentState.testPlanIr = testPlanIr;
      currentState.status = 'mapping';

      if (onStateChange) {
        await onStateChange({
          status: 'mapping',
          testPlanIr,
        });
      }

      // Step 2: Mapping Phase — Candidate Retrieval + Mapping Agent
      const mappings: StepLocatorMapping[] = [];

      for (const step of testPlanIr.steps) {
        const candidates = await candidateResolver(step.target_description, step.page_hint);
        const mappingResult = await this.mappingAgent.mapStepToElement(step, candidates);
        mappings.push(mappingResult.mapping);
      }

      currentState.mappings = mappings;

      // Step 3: Review / Codegen Gating Phase
      const hasReviewItems = mappings.some((m) => m.needs_review || m.element_id === null);
      const finalStatus: GenerationJobStatus = hasReviewItems ? 'review' : 'codegen';

      currentState.status = finalStatus;
      currentState.completedAt = new Date();

      if (onStateChange) {
        await onStateChange({
          status: finalStatus,
          mappings,
          completedAt: currentState.completedAt,
        });
      }

      return currentState;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      currentState.status = 'failed';
      currentState.errorMessage = errorMessage;
      currentState.completedAt = new Date();

      if (onStateChange) {
        await onStateChange({
          status: 'failed',
          errorMessage,
          completedAt: currentState.completedAt,
        });
      }

      return currentState;
    }
  }
}
