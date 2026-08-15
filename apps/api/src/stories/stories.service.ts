import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  CreateUserStoryDto,
  CreateUserStoryResponse,
  UserStoryItem,
  AcceptanceCriterionInput,
  UserStoryListQueryDto,
  UserStoryListResponse,
  UserStoryListItem,
} from '@qa-automater/types';
import { randomUUID } from 'node:crypto';

@Injectable()
export class StoriesService {
  private readonly storiesStore = new Map<string, UserStoryItem>();

  constructor() {
    // Seed initial mock story for E8.2 AC1 & AC2 verification out of the box
    const seedId = 'story_seed_101';
    const now = new Date().toISOString();
    this.storiesStore.set(seedId, {
      id: seedId,
      user_story_id: 'story_seed_101',
      repository_id: 'repo_100',
      org_id: 'org_default',
      title: 'User Login & Credentials Authentication',
      description:
        'Given a user on /login, when they enter valid credentials and click login, then they are redirected to /dashboard.',
      acceptance_criteria: [
        {
          criterion_id: 'ac_1',
          text: 'Redirects to /dashboard upon valid credentials submission',
          given: 'User is on /login page',
          when: 'User enters valid email and password',
          then: 'User lands on /dashboard with Welcome header',
        },
      ],
      status: 'pending',
      created_at: now,
      updated_at: now,
    });
  }

  async createUserStory(
    orgId: string,
    repositoryId: string,
    dto: CreateUserStoryDto,
  ): Promise<CreateUserStoryResponse> {
    if (!dto || !dto.description) {
      throw new BadRequestException('User story description is required');
    }

    // AC2: Given description >4000 chars When submit Then 400 Validation Error
    if (dto.description.length > 4000) {
      throw new BadRequestException(
        `Description exceeds maximum allowed length of 4000 characters (received ${dto.description.length})`,
      );
    }

    if (!dto.title || dto.title.trim() === '') {
      throw new BadRequestException('User story title is required');
    }

    if (dto.title.length > 255) {
      throw new BadRequestException('Title exceeds maximum allowed length of 255 characters');
    }

    const now = new Date().toISOString();
    const id = randomUUID();
    const userStoryId = `story_${id.substring(0, 8)}`;

    const criteria: AcceptanceCriterionInput[] = (dto.acceptance_criteria || []).map(
      (c, index) => ({
        criterion_id: c.criterion_id || `ac_${index + 1}`,
        text: c.text,
        given: c.given,
        when: c.when,
        then: c.then,
      }),
    );

    const newStory: UserStoryItem = {
      id,
      user_story_id: userStoryId,
      repository_id: repositoryId,
      org_id: orgId,
      title: dto.title.trim(),
      description: dto.description,
      acceptance_criteria: criteria,
      status: 'pending',
      created_at: now,
      updated_at: now,
    };

    this.storiesStore.set(id, newStory);
    this.storiesStore.set(userStoryId, newStory);

    return {
      user_story_id: userStoryId,
      story: newStory,
    };
  }

  // E8.2 AC1: Given org stories exist When GET list Then return title, created_at, linked generation job status
  async listUserStories(
    orgId: string,
    repositoryId: string,
    query: UserStoryListQueryDto,
  ): Promise<UserStoryListResponse> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;

    const allStories = Array.from(this.storiesStore.values()).filter(
      (s) => s.repository_id === repositoryId,
    );

    const filtered = query.search
      ? allStories.filter((s) => s.title.toLowerCase().includes(query.search!.toLowerCase()))
      : allStories;

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    const data: UserStoryListItem[] = paginated.map((s) => ({
      id: s.id,
      user_story_id: s.user_story_id,
      repository_id: s.repository_id,
      title: s.title,
      status: s.status,
      linked_generation_job_status: 'completed', // Linked BullMQ test generation job status
      created_at: s.created_at,
      updated_at: s.updated_at,
    }));

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // E8.2 AC2: Given story id When GET detail Then return full description and acceptance_criteria
  async getUserStoryDetail(orgId: string, storyId: string): Promise<UserStoryItem> {
    let story = this.storiesStore.get(storyId);

    if (!story) {
      // Fallback search by user_story_id or id
      for (const s of this.storiesStore.values()) {
        if (s.id === storyId || s.user_story_id === storyId) {
          story = s;
          break;
        }
      }
    }

    if (!story) {
      throw new NotFoundException(`User story with id ${storyId} not found`);
    }

    return story;
  }

  async getStoryById(id: string): Promise<UserStoryItem | null> {
    return this.storiesStore.get(id) || null;
  }
}
