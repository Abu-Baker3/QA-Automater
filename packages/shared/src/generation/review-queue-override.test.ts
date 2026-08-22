import { describe, it, expect } from 'vitest';
import { applyMappingOverride } from './review-queue';
import type { GenerationJob } from '@qa-automater/types';

describe('applyMappingOverride (E10.2)', () => {
  const initialJob: GenerationJob = {
    id: 'job_override_101',
    story_id: 'story_login_101',
    status: 'review',
    test_plan_ir: {
      user_story_id: 'story_login_101',
      title: 'Login Flow',
      summary: 'Login test plan',
      steps: [
        {
          step_id: 'step_1',
          action: 'fill',
          target_description: 'Enter email',
          expected_outcome: 'Email entered',
        },
        {
          step_id: 'step_2',
          action: 'click',
          target_description: 'Click Submit button',
          expected_outcome: 'Submitted',
        },
      ],
    },
    mappings: [
      {
        step_id: 'step_1',
        step_order: 1,
        element_id: 'elem_email_old',
        chosen_locator: null,
        confidence: 0.6,
        rationale: 'Low confidence match',
        needs_review: true,
        human_verified: false,
        candidates: [
          {
            id: 'elem_email_override',
            scan_id: 'scan_1',
            tag_name: 'input',
            source_ref: 'src/Login.tsx:10',
            stability_tier: 'high',
            primary_candidate: {
              strategy: 'id',
              value: 'email',
              score: 0.9,
              playwright_code: "page.locator('#email')",
              rank: 1,
              stability_tier: 'high',
            },
            candidates: [],
            relevance_score: 0.9,
          },
        ],
      },
      {
        step_id: 'step_2',
        step_order: 2,
        element_id: 'elem_btn_ok',
        chosen_locator: {
          strategy: 'css',
          value: '#submit',
          score: 0.95,
          playwright_code: "page.locator('#submit')",
          rank: 1,
          stability_tier: 'high',
        },
        confidence: 0.95,
        rationale: 'Exact match',
        needs_review: false,
        human_verified: false,
      },
    ],
    review_items: [],
    export_allowed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('AC1: sets confidence = 1.0, human_verified = true, and needs_review = false when PATCH override applied', () => {
    const updatedJob = applyMappingOverride(initialJob, 1, {
      element_id: 'elem_email_override',
      rationale: 'Verified email selector by QA Engineer',
    });

    const mapping = updatedJob.mappings?.[0];
    expect(mapping?.element_id).toBe('elem_email_override');
    expect(mapping?.confidence).toBe(1.0);
    expect(mapping?.human_verified).toBe(true);
    expect(mapping?.needs_review).toBe(false);
    expect(mapping?.rationale).toBe('Verified email selector by QA Engineer');
    expect(mapping?.chosen_locator?.value).toBe('email');
  });

  it('AC2: transitions job status from review to codegen and sets export_allowed = true when all steps resolved', () => {
    const updatedJob = applyMappingOverride(initialJob, 1, {
      element_id: 'elem_email_override',
    });

    expect(updatedJob.export_allowed).toBe(true);
    expect(updatedJob.status).toBe('codegen');
  });

  it('throws error if step_order is out of bounds', () => {
    expect(() => applyMappingOverride(initialJob, 99, { element_id: 'elem_none' })).toThrow();
  });
});
