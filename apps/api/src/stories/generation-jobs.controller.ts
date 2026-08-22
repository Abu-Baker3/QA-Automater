import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { GenerationJobsService } from './generation-jobs.service';
import type {
  GenerationJob,
  OverrideMappingRequest,
  StartGenerationRequest,
  StartGenerationResponse,
} from '@qa-automater/types';

@Controller()
@UseGuards(ClerkAuthGuard, RolesGuard)
export class GenerationJobsController {
  constructor(private readonly generationJobsService: GenerationJobsService) {}

  @Post('stories/:id/generate')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles('ADMIN', 'MEMBER')
  async startStoryGeneration(
    @Param('id') storyId: string,
    @Body() body?: Partial<StartGenerationRequest>,
  ): Promise<StartGenerationResponse> {
    return this.generationJobsService.startGeneration(storyId, body?.user_story);
  }

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles('ADMIN', 'MEMBER')
  async startGeneration(@Body() body: StartGenerationRequest): Promise<StartGenerationResponse> {
    return this.generationJobsService.startGeneration(body.story_id, body.user_story);
  }

  @Get('stories/generation-jobs/:id')
  @Roles('ADMIN', 'MEMBER')
  async getStoryGenerationJob(@Param('id') jobId: string): Promise<GenerationJob> {
    return this.generationJobsService.getJobById(jobId);
  }

  @Get('tests/jobs/:id')
  @Roles('ADMIN', 'MEMBER')
  async getTestJob(@Param('id') jobId: string): Promise<GenerationJob> {
    return this.generationJobsService.getJobById(jobId);
  }

  @Patch('stories/generation-jobs/:id/mappings/:stepOrder')
  @Roles('ADMIN', 'MEMBER')
  async overrideStoryJobMapping(
    @Param('id') jobId: string,
    @Param('stepOrder') stepOrder: string,
    @Body() body: OverrideMappingRequest,
  ): Promise<GenerationJob> {
    return this.generationJobsService.overrideMapping(jobId, parseInt(stepOrder, 10), body);
  }

  @Patch('generation-jobs/:id/mappings/:stepOrder')
  @Roles('ADMIN', 'MEMBER')
  async overrideJobMapping(
    @Param('id') jobId: string,
    @Param('stepOrder') stepOrder: string,
    @Body() body: OverrideMappingRequest,
  ): Promise<GenerationJob> {
    return this.generationJobsService.overrideMapping(jobId, parseInt(stepOrder, 10), body);
  }
}
