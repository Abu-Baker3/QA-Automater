import { describe, expect, it, vi } from 'vitest';
import type { TestPlanIR, UserStoryItem } from '@qa-automater/types';
import { StoryAgent, StoryAgentException, ILLMProvider } from './index';

const sampleLoginStory: UserStoryItem = {
  id: 'story_login_101',
  user_story_id: 'story_login_101',
  repository_id: 'repo_100',
  org_id: 'org_default',
  title: 'User Login & Credentials Authentication',
  description:
    'As a user, I want to log into the portal using my email and password so that I can access my dashboard.',
  acceptance_criteria: [
    {
      criterion_id: 'ac_1',
      text: 'User can enter credentials and see dashboard',
      given: 'User is on /login',
      when: 'Enters valid email and password and clicks Login',
      then: 'Redirected to /dashboard with welcome message',
    },
  ],
  status: 'pending',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const validLoginTestPlan: TestPlanIR = {
  user_story_id: 'story_login_101',
  title: 'User Login & Credentials Authentication',
  summary: 'Verify login flow with valid credentials',
  steps: [
    {
      step_id: 'step_1',
      action: 'navigate',
      target_description: 'Navigate to login page',
      value: '/login',
      expected_outcome: 'Login page renders with email and password inputs',
      page_hint: '/login',
    },
    {
      step_id: 'step_2',
      action: 'fill',
      target_description: 'Email input field',
      value: 'user@example.com',
      expected_outcome: 'Email field contains typed email',
    },
    {
      step_id: 'step_3',
      action: 'fill',
      target_description: 'Password input field',
      value: 'SecretPass123!',
      expected_outcome: 'Password field contains masked password',
    },
    {
      step_id: 'step_4',
      action: 'click',
      target_description: 'Submit Login button',
      expected_outcome: 'Login request is submitted',
    },
    {
      step_id: 'step_5',
      action: 'assert',
      target_description: 'Welcome Dashboard Header',
      value: 'Welcome to Dashboard',
      expected_outcome: 'Dashboard renders and contains welcome message',
      page_hint: '/dashboard',
    },
  ],
};

describe('StoryAgent (E9.2)', () => {
  it('AC1: decomposes login user story into >=4 steps with >=1 assert action', async () => {
    const mockProvider: ILLMProvider = {
      name: 'openai',
      model: 'gpt-4o',
      completeStructured: vi.fn().mockResolvedValue({
        data: validLoginTestPlan,
        rawText: JSON.stringify(validLoginTestPlan),
        provider: 'openai',
        model: 'gpt-4o',
      }),
    };

    const agent = new StoryAgent(mockProvider);
    const result = await agent.decomposeStory(sampleLoginStory);

    expect(result.status).toBe('success');
    expect(result.attempts).toBe(1);
    expect(result.test_plan.steps.length).toBeGreaterThanOrEqual(4);

    const assertSteps = result.test_plan.steps.filter((s) => s.action === 'assert');
    expect(assertSteps.length).toBeGreaterThanOrEqual(1);
    expect(mockProvider.completeStructured).toHaveBeenCalledTimes(1);
  });

  it('AC2: retries up to 2 times when initial LLM response fails validation, succeeding on retry', async () => {
    const invalidShortPlan: TestPlanIR = {
      user_story_id: 'story_login_101',
      title: 'Short plan',
      summary: 'Invalid plan with 2 steps and no assert',
      steps: [
        {
          step_id: 'step_1',
          action: 'navigate',
          target_description: 'Nav',
          expected_outcome: 'Ok',
        },
        {
          step_id: 'step_2',
          action: 'click',
          target_description: 'Btn',
          expected_outcome: 'Done',
        },
      ],
    };

    const mockCompleteStructured = vi
      .fn()
      // Attempt 1: fails step count and assert validation
      .mockResolvedValueOnce({
        data: invalidShortPlan,
        rawText: JSON.stringify(invalidShortPlan),
        provider: 'openai',
        model: 'gpt-4o',
      })
      // Attempt 2: returns valid plan
      .mockResolvedValueOnce({
        data: validLoginTestPlan,
        rawText: JSON.stringify(validLoginTestPlan),
        provider: 'openai',
        model: 'gpt-4o',
      });

    const mockProvider: ILLMProvider = {
      name: 'openai',
      model: 'gpt-4o',
      completeStructured: mockCompleteStructured,
    };

    const agent = new StoryAgent(mockProvider);
    const result = await agent.decomposeStory(sampleLoginStory, 2);

    expect(result.status).toBe('success');
    expect(result.attempts).toBe(2);
    expect(mockCompleteStructured).toHaveBeenCalledTimes(2);

    // Verify retry prompt contained error feedback
    const secondCallPrompt = mockCompleteStructured.mock.calls[1]?.[0];
    expect(secondCallPrompt?.userPrompt).toContain('CRITICAL RETRY NOTICE (Attempt 2/3)');
  });

  it('AC2 failure: fails job with StoryAgentException after 3 attempts if response remains invalid', async () => {
    const invalidPlan: TestPlanIR = {
      user_story_id: 'story_login_101',
      title: 'Invalid',
      summary: 'No assert step',
      steps: [
        {
          step_id: 'step_1',
          action: 'navigate',
          target_description: '1',
          expected_outcome: '1',
        },
        {
          step_id: 'step_2',
          action: 'fill',
          target_description: '2',
          expected_outcome: '2',
        },
        {
          step_id: 'step_3',
          action: 'fill',
          target_description: '3',
          expected_outcome: '3',
        },
        {
          step_id: 'step_4',
          action: 'click',
          target_description: '4',
          expected_outcome: '4',
        },
      ],
    };

    const mockCompleteStructured = vi.fn().mockResolvedValue({
      data: invalidPlan,
      rawText: JSON.stringify(invalidPlan),
      provider: 'openai',
      model: 'gpt-4o',
    });

    const mockProvider: ILLMProvider = {
      name: 'openai',
      model: 'gpt-4o',
      completeStructured: mockCompleteStructured,
    };

    const agent = new StoryAgent(mockProvider);

    await expect(agent.decomposeStory(sampleLoginStory, 2)).rejects.toThrow(StoryAgentException);

    expect(mockCompleteStructured).toHaveBeenCalledTimes(3);
  });

  it('rejects test plan steps missing expected_outcome in validateTestPlanIR', async () => {
    const invalidStepPlan = {
      user_story_id: 'story_login_101',
      title: 'Missing expected outcome step',
      summary: 'Test plan with missing expected_outcome string field',
      steps: [
        { step_id: 'step_1', action: 'navigate', target_description: 'Nav', expected_outcome: 'Ok' },
        { step_id: 'step_2', action: 'fill', target_description: 'Input', expected_outcome: 'Done' },
        { step_id: 'step_3', action: 'click', target_description: 'Btn', expected_outcome: 'Done' },
        { step_id: 'step_4', action: 'assert', target_description: 'Header' }, // missing expected_outcome
      ],
    };

    const mockProvider: ILLMProvider = {
      name: 'openai',
      model: 'gpt-4o',
      completeStructured: vi.fn().mockResolvedValue({
        data: invalidStepPlan,
        rawText: JSON.stringify(invalidStepPlan),
        provider: 'openai',
        model: 'gpt-4o',
      }),
    };

    const agent = new StoryAgent(mockProvider);
    await expect(agent.decomposeStory(sampleLoginStory, 0)).rejects.toThrow(StoryAgentException);
  });

  it('handles stories with missing acceptance_criteria and description safely', async () => {
    const minimalStory = {
      id: 'story_minimal_999',
      user_story_id: 'story_minimal_999',
      repository_id: 'repo_100',
      org_id: 'org_default',
      title: 'Minimal Story',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as UserStoryItem;


    const mockCompleteStructured = vi.fn().mockResolvedValue({
      data: validLoginTestPlan,
      rawText: JSON.stringify(validLoginTestPlan),
      provider: 'openai',
      model: 'gpt-4o',
    });

    const mockProvider: ILLMProvider = {
      name: 'openai',
      model: 'gpt-4o',
      completeStructured: mockCompleteStructured,
    };

    const agent = new StoryAgent(mockProvider);
    const result = await agent.decomposeStory(minimalStory);

    expect(result.status).toBe('success');
    const prompt = mockCompleteStructured.mock.calls[0]?.[0]?.userPrompt;
    expect(prompt).toContain('Description: No description provided');
    expect(prompt).toContain('Acceptance Criteria:\nNone provided');
  });
});

