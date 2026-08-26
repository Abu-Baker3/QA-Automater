import { describe, it, expect } from 'vitest';
import { assertExportAllowed, getPendingReviewItems } from './review-queue';
import type { GenerationJob } from '@qa-automater/types';

describe('review-queue export gating (E10.3)', () => {
  const jobWithLowConfidence: GenerationJob = {
    id: 'job_export_blocked_101',
    story_id: 'story_login_101',
    status: 'review',
    test_plan_ir: {
      user_story_id: 'story_login_101',
      title: 'Login Flow',
      summary: 'Login flow',
      steps: [
        {
          step_id: 'step_1',
          action: 'fill',
          target_description: 'Enter username',
          expected_outcome: 'Username filled',
        },
      ],
    },
    mappings: [
      {
        step_id: 'step_1',
        step_order: 1,
        element_id: 'elem_user_1',
        chosen_locator: null,
        confidence: 0.65,
        rationale: 'Low confidence match',
        needs_review: true,
        human_verified: false,
      },
    ],
    review_items: [
      {
        step_id: 'step_1',
        step_order: 1,
        action: 'fill',
        target_description: 'Enter username',
        confidence: 0.65,
        element_id: 'elem_user_1',
        chosen_locator: null,
        candidates: [],
        rationale: 'Low confidence match',
        needs_review: true,
        human_verified: false,
      },
    ],
    export_allowed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const jobAllResolved: GenerationJob = {
    ...jobWithLowConfidence,
    status: 'codegen',
    mappings: [
      {
        step_id: 'step_1',
        step_order: 1,
        element_id: 'elem_user_1',
        chosen_locator: {
          strategy: 'id',
          value: 'user_input',
          score: 1.0,
          playwright_code: "page.locator('#user_input')",
          rank: 1,
          stability_tier: 'high',
        },
        confidence: 1.0,
        rationale: 'Human override',
        needs_review: false,
        human_verified: true,
      },
    ],
    review_items: [],
    export_allowed: true,
  };

  it('AC1: getPendingReviewItems returns pending steps for unverified low-confidence job', () => {
    const pending = getPendingReviewItems(jobWithLowConfidence);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.step_id).toBe('step_1');
    expect(pending[0]?.confidence).toBe(0.65);
  });

  it('AC1: assertExportAllowed throws error when unresolved review items exist', () => {
    expect(() => assertExportAllowed(jobWithLowConfidence)).toThrowError(
      /Export blocked: 1 step locator mapping\(s\) require human review resolution/,
    );
  });

  it('AC2: assertExportAllowed succeeds when all step mappings are resolved', () => {
    expect(() => assertExportAllowed(jobAllResolved)).not.toThrow();
  });
});
