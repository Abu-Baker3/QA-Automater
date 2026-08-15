import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  CreateUserStoryDto,
  CreateUserStoryResponse,
  UserStoryListResponse,
  UserStoryDetailResponse,
} from '@qa-automater/types';
import { StoriesService } from './stories.service';

@Controller()
@UseGuards(ClerkAuthGuard, RolesGuard)
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Post('repositories/:id/stories')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'MEMBER')
  async createUserStory(
    @Param('id') repositoryId: string,
    @Body() dto: CreateUserStoryDto,
  ): Promise<CreateUserStoryResponse> {
    const orgId = 'org_default';
    return this.storiesService.createUserStory(orgId, repositoryId, dto);
  }

  // E8.2 AC1: Given org stories exist When GET list Then return title, created_at, linked generation job status
  @Get('repositories/:id/stories')
  @Roles('ADMIN', 'MEMBER')
  async listUserStories(
    @Param('id') repositoryId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ): Promise<UserStoryListResponse> {
    const orgId = 'org_default';
    return this.storiesService.listUserStories(orgId, repositoryId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
  }

  // E8.2 AC2: Given story id When GET detail Then return full description and acceptance_criteria
  @Get('stories/:id')
  @Roles('ADMIN', 'MEMBER')
  async getUserStoryDetail(@Param('id') storyId: string): Promise<UserStoryDetailResponse> {
    const orgId = 'org_default';
    return this.storiesService.getUserStoryDetail(orgId, storyId);
  }
}
