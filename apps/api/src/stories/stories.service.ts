import { Injectable, BadRequestException } from '@nestjs/common';
import {
  CreateUserStoryDto,
  CreateUserStoryResponse,
  UserStoryItem,
  AcceptanceCriterionInput,
} from '@qa-automater/types';
import { randomUUID } from 'node:crypto';

@Injectable()
export class StoriesService {
  private readonly storiesStore = new Map<string, UserStoryItem>();

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

    return {
      user_story_id: userStoryId,
      story: newStory,
    };
  }

  async getStoryById(id: string): Promise<UserStoryItem | null> {
    return this.storiesStore.get(id) || null;
  }
}
