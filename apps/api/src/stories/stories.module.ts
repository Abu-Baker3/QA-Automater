import { Module } from '@nestjs/common';
import { StoriesController } from './stories.controller';
import { StoriesDecomposeController } from './stories-decompose.controller';
import { RagRetrievalController } from './rag-retrieval.controller';
import { StoriesService } from './stories.service';
import { StoryAgentService } from './story-agent.service';
import { RagRetrievalService } from './rag-retrieval.service';
import { LlmModule } from '../llm/llm.module';
import { ElementsModule } from '../elements/elements.module';

@Module({
  imports: [LlmModule, ElementsModule],
  controllers: [StoriesController, StoriesDecomposeController, RagRetrievalController],
  providers: [StoriesService, StoryAgentService, RagRetrievalService],
  exports: [StoriesService, StoryAgentService, RagRetrievalService],
})
export class StoriesModule {}
