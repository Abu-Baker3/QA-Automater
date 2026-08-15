import { describe, it, expect, beforeEach } from 'vitest';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';
import { BadRequestException } from '@nestjs/common';
import { CreateUserStoryDto } from '@qa-automater/types';

describe('StoriesController & StoriesService (E8.1)', () => {
  let controller: StoriesController;
  let service: StoriesService;

  beforeEach(() => {
    service = new StoriesService();
    controller = new StoriesController(service);
  });

  describe('POST /repositories/:id/stories', () => {
    it('AC1: Given valid payload When POST /repositories/:id/stories Then 201 with user_story_id', async () => {
      const dto: CreateUserStoryDto = {
        title: 'User Login Authentication Story',
        description:
          'Given a user on /login, when they enter valid credentials and click login, then they are redirected to /dashboard.',
        acceptance_criteria: [
          {
            text: 'Successful login redirects to /dashboard',
            given: 'user is on /login page',
            when: 'user enters valid email and password and clicks Sign In',
            then: 'user is redirected to /dashboard',
          },
        ],
      };

      const result = await controller.createUserStory('repo_100', dto);

      expect(result).toBeDefined();
      expect(result.user_story_id).toMatch(/^story_[a-f0-9]{8}$/);
      expect(result.story.repository_id).toBe('repo_100');
      expect(result.story.title).toBe('User Login Authentication Story');
      expect(result.story.acceptance_criteria.length).toBe(1);
      expect(result.story.acceptance_criteria[0]!.given).toBe('user is on /login page');
      expect(result.story.status).toBe('pending');
    });

    it('AC2: Given description >4000 chars When submit Then 400 Validation Error', async () => {
      const longDescription = 'a'.repeat(4001);
      const dto: CreateUserStoryDto = {
        title: 'Overly Long User Story',
        description: longDescription,
      };

      await expect(controller.createUserStory('repo_100', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('AC2 Boundary: Given description exactly 4000 chars When submit Then 201 Created', async () => {
      const exact4000Description = 'b'.repeat(4000);
      const dto: CreateUserStoryDto = {
        title: 'Exact 4000 Char User Story',
        description: exact4000Description,
      };

      const result = await controller.createUserStory('repo_100', dto);

      expect(result).toBeDefined();
      expect(result.story.description.length).toBe(4000);
    });

    it('should throw BadRequestException if title is missing or empty', async () => {
      const dto: CreateUserStoryDto = {
        title: '',
        description: 'Valid story description',
      };

      await expect(controller.createUserStory('repo_100', dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
