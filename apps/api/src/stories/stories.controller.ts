import { Controller, Post, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateUserStoryDto, CreateUserStoryResponse } from '@qa-automater/types';
import { StoriesService } from './stories.service';

@Controller('repositories')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Post(':id/stories')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'MEMBER')
  async createUserStory(
    @Param('id') repositoryId: string,
    @Body() dto: CreateUserStoryDto,
  ): Promise<CreateUserStoryResponse> {
    const orgId = 'org_default';
    return this.storiesService.createUserStory(orgId, repositoryId, dto);
  }
}
