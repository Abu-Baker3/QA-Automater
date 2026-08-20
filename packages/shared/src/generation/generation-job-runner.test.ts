import { describe, expect, it, vi } from 'vitest';
import type {
  ElementSearchResultItem,
  StepLocatorMapping,
  TestPlanIR,
  UserStoryDetails,
} from '@qa-automater/types';
import { ILLMProvider } from '../llm/types';
import { GenerationJobRunner } from './generation-job-runner';

const sampleStory: UserStoryDetails = {
  id: 'story_login_101',
  title: 'User Login with Email and Password',
  description: 'As a registered user, I want to log in using my email and password.',
  acceptance_criteria: [
    'User sees email and password input fields on login page',
    'User clicks submit button and navigates to dashboard',
  ],
  repository_id: 'repo_main',
};

const mockTestPlan: TestPlanIR = {
  user_story_id: 'story_login_101',
  title: 'User Login Flow',
  summary: 'Decomposed test plan for user login flow',

  steps: [
    {
      step_id: 'step_1',
      action: 'fill',
      target_description: 'Email input on login page',
      value: 'user@example.com',
      expected_outcome: 'Email address entered into input field',
      page_hint: '/login',
    },
    {
      step_id: 'step_2',
      action: 'fill',
      target_description: 'Password input on login page',
      value: 'SecretPass123',
      expected_outcome: 'Password entered into input field',
      page_hint: '/login',
    },
    {
      step_id: 'step_3',
      action: 'click',
      target_description: 'Submit login button',
      expected_outcome: 'Form submitted and authentication request sent',
      page_hint: '/login',
    },
    {
      step_id: 'step_4',
      action: 'assert',
      target_description: 'Dashboard welcome message',
      expected_outcome: 'User is redirected to dashboard and welcome banner is visible',
      page_hint: '/dashboard',
    },
  ],
};

const mockStepMapping: StepLocatorMapping = {
  step_id: 'step_1',
  element_id: 'elem_email_101',
  chosen_locator: {
    strategy: 'label',
    value: 'Email Address',
    score: 0.95,
    playwright_code: "page.getByLabel('Email Address')",
    rank: 1,
    stability_tier: 'high',
  },
  confidence: 0.95,
  rationale: 'Mapped to Email Address input in app/login/page.tsx:24',
  needs_review: false,
  source_ref: 'app/login/page.tsx:24',
};

describe('GenerationJobRunner (E9.5)', () => {
  it('AC1 & AC2: progresses pipeline status (planning -> mapping -> codegen) and stores testPlanIr & modelVersions', async () => {
    const mockProvider: ILLMProvider = {
      name: 'openai',
      model: 'gpt-4o',
      completeStructured: vi.fn().mockImplementation(async (prompt, schema) => {
        if (schema.name === 'TestPlanSchema') {
          return {
            data: mockTestPlan,
            rawText: JSON.stringify(mockTestPlan),
            provider: 'openai',
            model: 'gpt-4o',
          };
        }
        const stepIdMatch = prompt.userPrompt.match(/Test Step ID:\s*([^\r\n]+)/);
        const stepId = stepIdMatch ? stepIdMatch[1].trim() : 'step_1';
        return {
          data: {
            ...mockStepMapping,
            step_id: stepId,
          },
          rawText: JSON.stringify(mockStepMapping),
          provider: 'openai',
          model: 'gpt-4o',
        };
      }),
    };

    const runner = new GenerationJobRunner(mockProvider);
    const candidateResolver = vi
      .fn()
      .mockResolvedValue([
        { id: 'elem_email_101', tag_name: 'input', source_ref: 'app/login/page.tsx:24' },
      ] as ElementSearchResultItem[]);

    const statusHistory: string[] = [];
    const state = await runner.runPipeline(
      'job_test_101',
      sampleStory,
      candidateResolver,
      async (partial) => {
        if (partial.status) {
          statusHistory.push(partial.status);
        }
      },
    );

    expect(state.status).toBe('codegen');

    expect(state.testPlanIr).toEqual(mockTestPlan);
    expect(state.mappings).toHaveLength(4);
    expect(state.modelVersions?.story_agent?.model).toBe('gpt-4o');
    expect(state.modelVersions?.mapping_agent?.model).toBe('gpt-4o');
    expect(statusHistory).toEqual(['planning', 'mapping', 'codegen']);
  });

  it('sets status to review if any mapped step has needs_review=true', async () => {
    const reviewMapping: StepLocatorMapping = {
      ...mockStepMapping,
      confidence: 0.7,
      needs_review: true,
    };

    const mockProvider: ILLMProvider = {
      name: 'openai',
      model: 'gpt-4o',
      completeStructured: vi.fn().mockImplementation(async (prompt, schema) => {
        if (schema.name === 'TestPlanSchema') {
          return {
            data: mockTestPlan,
            rawText: JSON.stringify(mockTestPlan),
            provider: 'openai',
            model: 'gpt-4o',
          };
        }
        const stepIdMatch = prompt.userPrompt.match(/Test Step ID:\s*([^\r\n]+)/);
        const stepId = stepIdMatch ? stepIdMatch[1].trim() : 'step_1';
        return {
          data: {
            ...reviewMapping,
            step_id: stepId,
          },
          rawText: JSON.stringify(reviewMapping),
          provider: 'openai',
          model: 'gpt-4o',
        };
      }),
    };

    const runner = new GenerationJobRunner(mockProvider);
    const candidateResolver = vi
      .fn()
      .mockResolvedValue([
        { id: 'elem_email_101', tag_name: 'input', source_ref: 'app/login/page.tsx:24' },
      ] as ElementSearchResultItem[]);

    const state = await runner.runPipeline('job_test_102', sampleStory, candidateResolver);

    expect(state.status).toBe('review');
    expect(state.mappings?.[0]?.needs_review).toBe(true);
  });
});
