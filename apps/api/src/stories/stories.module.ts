import { Module } from '@nestjs/common';
import { StoriesController } from './stories.controller';
import { StoriesDecomposeController } from './stories-decompose.controller';
import { StoriesService } from './stories.service';
import { StoryAgentService } from './story-agent.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  controllers: [StoriesController, StoriesDecomposeController],
  providers: [StoriesService, StoryAgentService],
  exports: [StoriesService, StoryAgentService],
})
export class StoriesModule {}
