import {
  Controller,
  Post,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { StoriesService } from './stories.service';
import { StoryAgentService } from './story-agent.service';
import { StoryAgentException } from '@qa-automater/shared';
import type { StoryDecompositionResult } from '@qa-automater/types';

@Controller('stories')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class StoriesDecomposeController {
  constructor(
    private readonly storiesService: StoriesService,
    private readonly storyAgentService: StoryAgentService,
  ) {}

  @Post(':id/decompose')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'MEMBER')
  async decomposeStory(
    @Request() req: { user?: { org_id?: string } },
    @Param('id') id: string,
  ): Promise<StoryDecompositionResult> {
    const orgId = req.user?.org_id || 'org_default';
    const story = await this.storiesService.getUserStoryDetail(orgId, id);
    try {
      return await this.storyAgentService.decomposeStory(story);
    } catch (err) {
      if (err instanceof StoryAgentException) {
        throw new UnprocessableEntityException(err.message);
      }
      throw err;
    }
  }
}
