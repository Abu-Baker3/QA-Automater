import { Module } from '@nestjs/common';
import { StoriesController } from './stories.controller';
import { StoriesDecomposeController } from './stories-decompose.controller';
import { RagRetrievalController } from './rag-retrieval.controller';
import { MappingAgentController } from './mapping-agent.controller';
import { GenerationJobsController } from './generation-jobs.controller';
import { StoriesService } from './stories.service';
import { StoryAgentService } from './story-agent.service';
import { RagRetrievalService } from './rag-retrieval.service';
import { MappingAgentService } from './mapping-agent.service';
import { GenerationJobsService } from './generation-jobs.service';
import { LlmModule } from '../llm/llm.module';
import { ElementsModule } from '../elements/elements.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [LlmModule, ElementsModule, DatabaseModule],
  controllers: [
    StoriesController,
    StoriesDecomposeController,
    RagRetrievalController,
    MappingAgentController,
    GenerationJobsController,
  ],
  providers: [
    StoriesService,
    StoryAgentService,
    RagRetrievalService,
    MappingAgentService,
    GenerationJobsService,
  ],
  exports: [
    StoriesService,
    StoryAgentService,
    RagRetrievalService,
    MappingAgentService,
    GenerationJobsService,
  ],
})
export class StoriesModule {}
