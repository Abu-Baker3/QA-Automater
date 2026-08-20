import type {
  LLMJsonSchema,
  StoryDecompositionResult,
  TestPlanIR,
  TestPlanStep,
  TestStepAction,
  UserStoryItem,
} from '@qa-automater/types';
import { incrementCounter, recordHistogram, withSpan } from '../telemetry';
import { ILLMProvider } from './types';

export class StoryAgentException extends Error {
  readonly storyId: string;
  readonly attempts: number;

  constructor(message: string, storyId: string, attempts: number) {
    super(message);
    this.name = 'StoryAgentException';
    this.storyId = storyId;
    this.attempts = attempts;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const VALID_ACTIONS: Set<TestStepAction> = new Set([
  'navigate',
  'fill',
  'click',
  'assert',
  'select',
  'wait',
]);

export function validateTestPlanIR(data: unknown): data is TestPlanIR {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const obj = data as Record<string, unknown>;
  if (
    typeof obj.user_story_id !== 'string' ||
    typeof obj.title !== 'string' ||
    !Array.isArray(obj.steps)
  ) {
    return false;
  }

  // AC1: >= 4 steps required
  if (obj.steps.length < 4) {
    return false;
  }

  let hasAssertAction = false;
  for (const step of obj.steps as TestPlanStep[]) {
    if (!step || typeof step !== 'object') {
      return false;
    }
    if (
      typeof step.step_id !== 'string' ||
      typeof step.target_description !== 'string' ||
      typeof step.expected_outcome !== 'string'
    ) {
      return false;
    }
    if (!VALID_ACTIONS.has(step.action)) {
      return false;
    }
    if (step.action === 'assert') {
      hasAssertAction = true;
    }
  }

  // AC1: >= 1 assert action required
  return hasAssertAction;
}

export const TestPlanJsonSchema: LLMJsonSchema<TestPlanIR> = {
  name: 'TestPlanSchema',
  description: 'Schema for decomposed user story test plan steps',
  schema: {
    type: 'object',
    properties: {
      user_story_id: { type: 'string' },
      title: { type: 'string' },
      summary: { type: 'string' },
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            step_id: { type: 'string' },
            action: {
              type: 'string',
              enum: ['navigate', 'fill', 'click', 'assert', 'select', 'wait'],
            },
            target_description: { type: 'string' },
            value: { type: 'string' },
            expected_outcome: { type: 'string' },
            page_hint: { type: 'string' },
          },
          required: ['step_id', 'action', 'target_description', 'expected_outcome'],
        },
      },
    },
    required: ['user_story_id', 'title', 'summary', 'steps'],
  },
  validator: validateTestPlanIR,
};

export class StoryAgent {
  private readonly provider: ILLMProvider;

  constructor(provider: ILLMProvider) {
    this.provider = provider;
  }

  /**
   * Decomposes a User Story into a structured Test Plan IR.
   * - AC1: Requires >= 4 steps with at least 1 'assert' action.
   * - AC2: Retries up to 2 times (3 total attempts) if LLM produces invalid JSON or fails validation rules.
   */
  async decomposeStory(story: UserStoryItem, maxRetries = 2): Promise<StoryDecompositionResult> {
    const storyId = story.user_story_id || story.id;
    const startTime = Date.now();
    const maxAttempts = Math.max(1, maxRetries + 1);

    return withSpan('story_agent.decomposeStory', 'decomposeStory', async (span) => {
      span.setAttribute('story.id', storyId);
      span.setAttribute('story.title', story.title);

      let lastError = '';

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const criteriaText = story.acceptance_criteria
          ?.map((c, i) => {
            if (typeof c === 'string') {
              return `AC${i + 1}: ${c}`;
            }
            return `AC${i + 1}: ${c.text || ''}${c.given ? ` [Given: ${c.given}]` : ''}${c.when ? ` [When: ${c.when}]` : ''}${c.then ? ` [Then: ${c.then}]` : ''}`;
          })
          .join('\n');

        const systemPrompt = `You decompose user stories into executable browser test steps.
Output JSON matching TestPlanSchema.

CRITICAL CONSTRAINTS:
1. Output MUST contain AT LEAST 4 test steps.
2. Output MUST contain AT LEAST 1 "assert" action step verifying an observable outcome.
3. Valid actions: "navigate" | "fill" | "click" | "assert" | "select" | "wait".
4. Set user_story_id to "${storyId}".`;

        let userPrompt = `User Story Title: ${story.title}
Description: ${story.description || 'No description provided'}
Acceptance Criteria:
${criteriaText || 'None provided'}`;

        if (attempt > 1) {
          userPrompt += `\n\nCRITICAL RETRY NOTICE (Attempt ${attempt}/${maxAttempts}): Your previous response failed validation: "${lastError}". You MUST output at least 4 test steps including at least 1 "assert" action.`;
        }

        try {
          const response = await this.provider.completeStructured(
            {
              systemPrompt,
              userPrompt,
              temperature: 0.2,
            },
            TestPlanJsonSchema,
          );

          // Additional verification check
          if (!validateTestPlanIR(response.data)) {
            const rawSteps = (response.data as { steps?: unknown[] } | undefined)?.steps;
            const stepCount = Array.isArray(rawSteps) ? rawSteps.length : 0;
            throw new Error(
              `Test plan fails constraint requirements: MUST contain at least 4 steps and at least 1 'assert' action step (received ${stepCount} steps)`,
            );
          }

          const durationMs = Date.now() - startTime;
          recordHistogram('story_agent', 'decomposition.duration_ms', durationMs);
          incrementCounter('story_agent', 'decomposition.success', 1, {
            attempts: String(attempt),
          });

          return {
            test_plan: response.data,
            attempts: attempt,
            status: 'success',
          };
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          incrementCounter('story_agent', 'decomposition.attempt_failed', 1, {
            attempt: String(attempt),
          });

          console.warn(
            `[Story Agent] Decomposition attempt ${attempt}/${maxAttempts} failed for story '${storyId}': ${lastError}`,
          );

          if (attempt === maxAttempts) {
            incrementCounter('story_agent', 'decomposition.failed', 1);
            throw new StoryAgentException(
              `Story Agent failed to decompose user story '${storyId}' after ${maxAttempts} attempts: ${lastError}`,
              storyId,
              maxAttempts,
            );
          }
        }
      }

      throw new StoryAgentException(
        `Story Agent failed to decompose user story '${storyId}'`,
        storyId,
        maxAttempts,
      );
    });
  }
}
