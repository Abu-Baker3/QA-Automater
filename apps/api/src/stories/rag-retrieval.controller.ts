import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RagRetrievalService } from './rag-retrieval.service';
import type { HybridRetrievalRequest, HybridRetrievalResult } from '@qa-automater/types';

@Controller('stories')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class RagRetrievalController {
  constructor(private readonly ragRetrievalService: RagRetrievalService) {}

  @Post('retrieve-candidates')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'MEMBER')
  async retrieveCandidates(@Body() body: HybridRetrievalRequest): Promise<HybridRetrievalResult> {
    if (!body || !body.step_description || !body.step_description.trim()) {
      throw new BadRequestException('step_description is required');
    }
    return this.ragRetrievalService.retrieveCandidates(body);
  }

  @Post('repositories/:id/retrieve-candidates')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'MEMBER')
  async retrieveRepositoryCandidates(
    @Param('id') repositoryId: string,
    @Body() body: HybridRetrievalRequest,
  ): Promise<HybridRetrievalResult> {
    if (!body || !body.step_description || !body.step_description.trim()) {
      throw new BadRequestException('step_description is required');
    }
    return this.ragRetrievalService.retrieveCandidates({
      ...body,
      repository_id: repositoryId,
    });
  }
}
