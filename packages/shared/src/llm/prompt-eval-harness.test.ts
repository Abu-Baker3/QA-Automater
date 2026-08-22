import { describe, it, expect } from 'vitest';
import {
  computePromptHash,
  STORY_AGENT_PROMPT_VERSION,
  MAPPING_AGENT_PROMPT_VERSION,
} from './prompt-versioning';
import { PromptEvalHarness, PromptRegressionException } from './prompt-eval-harness';
import { GenerationJobRunner } from '../generation/generation-job-runner';
import { ILLMProvider } from './types';

const mockProvider: ILLMProvider = {
  name: 'openai',
  model: 'gpt-4o',
  completeStructured: async <T>() => ({
    data: {
      user_story_id: 'story_login_101',
      title: 'User Login',
      summary: 'Login flow summary',
      steps: [
        {
          step_id: 'step_1',
          action: 'navigate',
          target_description: 'Go to /login',
          expected_outcome: 'On login page',
        },
        {
          step_id: 'step_2',
          action: 'fill',
          target_description: 'Enter email',
          expected_outcome: 'Email entered',
        },
        {
          step_id: 'step_3',
          action: 'fill',
          target_description: 'Enter password',
          expected_outcome: 'Password entered',
        },
        {
          step_id: 'step_4',
          action: 'assert',
          target_description: 'Check dashboard',
          expected_outcome: 'Dashboard visible',
        },
      ],
    } as unknown as T,
    rawText: 'mock json',
    provider: 'openai',
    model: 'gpt-4o',
  }),
};

describe('Prompt Versioning and Eval Harness (E9.6)', () => {
  describe('computePromptHash', () => {
    it('AC1: produces deterministic sha256 prefix hash for system and user prompts', () => {
      const hash1 = computePromptHash('System prompt text', 'User prompt template');
      const hash2 = computePromptHash('System prompt text', 'User prompt template');
      const hash3 = computePromptHash('System prompt text modified', 'User prompt template');

      expect(hash1).toMatch(/^sha256:[a-f0-9]{16}$/);
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });
  });

  describe('GenerationJobRunner Model Versions Integration', () => {
    it('AC1: populates prompt_version and prompt_hash in story_agent and mapping_agent model_versions', async () => {
      const runner = new GenerationJobRunner(mockProvider);
      const story = {
        id: 'story_login_101',
        title: 'Login Flow',
        description: 'Enter valid credentials',
      };
      const candidateResolver = async () => [];

      const result = await runner.runPipeline('job_101', story, candidateResolver);

      expect(result.modelVersions?.story_agent?.prompt_version).toBe(STORY_AGENT_PROMPT_VERSION);
      expect(result.modelVersions?.story_agent?.prompt_hash).toMatch(/^sha256:[a-f0-9]{16}$/);
      expect(result.modelVersions?.mapping_agent?.prompt_version).toBe(
        MAPPING_AGENT_PROMPT_VERSION,
      );
      expect(result.modelVersions?.mapping_agent?.prompt_hash).toMatch(/^sha256:[a-f0-9]{16}$/);
    });
  });

  describe('PromptEvalHarness (AC2)', () => {
    it('allows deployment when precision drop is within 5% threshold (e.g. 95% -> 92%, 3% drop)', () => {
      const result = PromptEvalHarness.evaluatePromptPrecision(0.95, 0.92, {
        max_precision_drop: 0.05,
      });

      expect(result.deploy_blocked).toBe(false);
      expect(result.precision).toBe(0.92);
      expect(result.precision_delta).toBeCloseTo(0.03);
    });

    it('AC2: blocks deploy with PromptRegressionException when precision drops > 5% (e.g. 95% -> 88%, 7% drop)', () => {
      expect(() =>
        PromptEvalHarness.evaluatePromptPrecision(0.95, 0.88, { max_precision_drop: 0.05 }),
      ).toThrow(PromptRegressionException);
    });
  });
});
