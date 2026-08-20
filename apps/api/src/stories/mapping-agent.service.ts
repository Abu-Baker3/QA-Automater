import { Injectable, BadRequestException } from '@nestjs/common';
import type {
  ElementSearchResultItem,
  MappingAgentResult,
  TestPlanStep,
} from '@qa-automater/types';
import { MappingAgent } from '@qa-automater/shared';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class MappingAgentService {
  constructor(private readonly llmService: LlmService) {}

  /**
   * Maps a Test Plan IR step to candidate UI elements using MappingAgent.
   */
  async mapStepToElement(
    step: TestPlanStep,
    candidates: ElementSearchResultItem[],
    maxRetries = 2,
  ): Promise<MappingAgentResult> {
    if (!step || !step.step_id) {
      throw new BadRequestException('Test plan step details must be provided with a valid step_id');
    }

    const agent = new MappingAgent(this.llmService);
    return agent.mapStepToElement(step, candidates || [], maxRetries);
  }
}
