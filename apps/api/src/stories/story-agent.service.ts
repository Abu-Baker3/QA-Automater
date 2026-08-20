import { Injectable, NotFoundException } from '@nestjs/common';
import type { StoryDecompositionResult, UserStoryItem } from '@qa-automater/types';
import { StoryAgent } from '@qa-automater/shared';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class StoryAgentService {
  constructor(private readonly llmService: LlmService) {}

  async decomposeStory(story: UserStoryItem, maxRetries = 2): Promise<StoryDecompositionResult> {
    if (!story) {
      throw new NotFoundException('User story details not provided');
    }

    const agent = new StoryAgent(this.llmService);
    return agent.decomposeStory(story, maxRetries);
  }
}
