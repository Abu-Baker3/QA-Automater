import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import type { TestPlanIR } from '@qa-automater/types';
import { StoriesDecomposeController } from './stories-decompose.controller';
import { StoriesService } from './stories.service';
import { StoryAgentService } from './story-agent.service';

const mockDecomposedPlan: TestPlanIR = {
  user_story_id: 'story_seed_101',
  title: 'User Login & Credentials Authentication',
  summary: 'Decomposed login flow',
  steps: [
    {
      step_id: 'step_1',
      action: 'navigate',
      target_description: 'Open login page',
      expected_outcome: 'Login page rendered',
    },
    {
      step_id: 'step_2',
      action: 'fill',
      target_description: 'Email field',
      value: 'test@example.com',
      expected_outcome: 'Email entered',
    },
    {
      step_id: 'step_3',
      action: 'fill',
      target_description: 'Password field',
      value: 'secret',
      expected_outcome: 'Password entered',
    },
    {
      step_id: 'step_4',
      action: 'click',
      target_description: 'Login button',
      expected_outcome: 'Form submitted',
    },
    {
      step_id: 'step_5',
      action: 'assert',
      target_description: 'Dashboard header',
      value: 'Dashboard',
      expected_outcome: 'Dashboard title displayed',
    },
  ],
};

describe('StoriesDecomposeController (E9.2)', () => {
  let controller: StoriesDecomposeController;
  let storiesService: StoriesService;
  let storyAgentService: StoryAgentService;

  beforeEach(() => {
    storiesService = new StoriesService();
    storyAgentService = {
      decomposeStory: vi.fn().mockResolvedValue({
        test_plan: mockDecomposedPlan,
        attempts: 1,
        status: 'success',
      }),
    } as unknown as StoryAgentService;

    controller = new StoriesDecomposeController(storiesService, storyAgentService);
  });

  it('POST /stories/:id/decompose returns test plan IR on valid story ID', async () => {
    const result = await controller.decomposeStory(
      { user: { org_id: 'org_default' } },
      'story_seed_101',
    );

    expect(result.status).toBe('success');
    expect(result.test_plan.steps.length).toBeGreaterThanOrEqual(4);

    const hasAssert = result.test_plan.steps.some((s) => s.action === 'assert');
    expect(hasAssert).toBe(true);
    expect(storyAgentService.decomposeStory).toHaveBeenCalledTimes(1);
  });

  it('POST /stories/:id/decompose throws 404 when story ID does not exist', async () => {
    await expect(
      controller.decomposeStory({ user: { org_id: 'org_default' } }, 'non_existent_story_id'),
    ).rejects.toThrow(NotFoundException);
  });

  it('POST /stories/:id/decompose throws UnprocessableEntityException when StoryAgentException is thrown', async () => {
    const { StoryAgentException } = await import('@qa-automater/shared');
    const { UnprocessableEntityException } = await import('@nestjs/common');

    (storyAgentService.decomposeStory as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new StoryAgentException('Failed to decompose story after 3 attempts', 'story_seed_101', 3),
    );

    await expect(
      controller.decomposeStory({ user: { org_id: 'org_default' } }, 'story_seed_101'),
    ).rejects.toThrow(UnprocessableEntityException);
  });
});

