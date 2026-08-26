import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { GenerateTestDto } from './dto/generate-test.dto';
import { GenerationJobsService } from '../stories/generation-jobs.service';
import type { ExportJobRequest, ExportJobResponse } from '@qa-automater/types';

@Controller('tests')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class TestsController {
  constructor(private readonly generationJobsService: GenerationJobsService) {}

  @Post('generate')
  @Roles('ADMIN', 'MEMBER')
  @HttpCode(HttpStatus.OK)
  async generateTest(@Body() dto: GenerateTestDto) {
    return {
      status: 'success',
      jobId: `test_job_${Date.now()}`,
      userStory: dto.userStory,
      repositoryId: dto.repositoryId,
    };
  }

  @Post('export')
  @Roles('ADMIN', 'MEMBER')
  @HttpCode(HttpStatus.OK)
  async exportTestJob(@Body() body: ExportJobRequest): Promise<ExportJobResponse> {
    return this.generationJobsService.exportGenerationJob(body.job_id);
  }
}
