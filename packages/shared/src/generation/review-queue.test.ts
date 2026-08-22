import { describe, it, expect } from 'vitest';
import { buildReviewItems, isExportAllowed } from './review-queue';
import type { StepLocatorMapping, TestPlanIR } from '@qa-automater/types';

describe('Review Queue API (E10.1)', () => {
  const sampleTestPlan: TestPlanIR = {
    user_story_id: 'story_login_101',
    title: 'User Login Flow',
    summary: 'Automated test plan for user login',
    steps: [
      {
        step_id: 'step_1',
        action: 'navigate',
        target_description: 'Navigate to /login',
        expected_outcome: 'Login page displayed',
      },
      {
        step_id: 'step_2',
        action: 'fill',
        target_description: 'Enter username',
        expected_outcome: 'Username field filled',
      },
      {
        step_id: 'step_3',
        action: 'click',
        target_description: 'Click Submit button',
        expected_outcome: 'Dashboard displayed',
      },
    ],
  };

  const sampleMappings: StepLocatorMapping[] = [
    {
      step_id: 'step_1',
      step_order: 1,
      element_id: 'elem_nav_1',
      chosen_locator: {
        strategy: 'css',
        value: '#nav',
        score: 0.9,
        playwright_code: "page.locator('#nav')",
        rank: 1,
        stability_tier: 'high',
      },
      confidence: 0.95,
      rationale: 'Exact match',
      needs_review: false,
    },
    {
      step_id: 'step_2',
      step_order: 2,
      element_id: 'elem_user_2',
      chosen_locator: {
        strategy: 'id',
        value: 'username',
        score: 0.8,
        playwright_code: "page.locator('#username')",
        rank: 1,
        stability_tier: 'high',
      },
      confidence: 0.72,
      rationale: 'Low confidence candidate match',
      needs_review: true,
      candidates: [
        {
          id: 'elem_user_2',
          scan_id: 'scan_1',
          tag_name: 'input',
          source_ref: 'src/Login.tsx:12',
          stability_tier: 'high',
          primary_candidate: {
            strategy: 'id',
            value: 'username',
            score: 0.8,
            playwright_code: "page.locator('#username')",
            rank: 1,
            stability_tier: 'high',
          },
          candidates: [],
          relevance_score: 0.72,
        },
      ],
    },
    {
      step_id: 'step_3',
      step_order: 3,
      element_id: null,
      chosen_locator: null,
      confidence: 0.0,
      rationale: 'No element found',
      needs_review: true,
    },
  ];

  describe('buildReviewItems (AC1)', () => {
    it('AC1: populates review_items with step_order, confidence, candidates, and rationale', () => {
      const items = buildReviewItems(sampleTestPlan, sampleMappings);

      expect(items).toHaveLength(3);
      expect(items[0]).toEqual({
        step_id: 'step_1',
        step_order: 1,
        action: 'navigate',
        target_description: 'Navigate to /login',
        confidence: 0.95,
        element_id: 'elem_nav_1',
        chosen_locator: {
          strategy: 'css',
          value: '#nav',
          score: 0.9,
          playwright_code: "page.locator('#nav')",
          rank: 1,
          stability_tier: 'high',
        },
        candidates: [],
        rationale: 'Exact match',
        needs_review: false,
        human_verified: false,
      });

      expect(items[1]!.step_order).toBe(2);
      expect(items[1]!.confidence).toBe(0.72);
      expect(items[1]!.candidates).toHaveLength(1);
      expect(items[1]!.needs_review).toBe(true);
    });

    it('returns empty array when test plan or mappings are missing', () => {
      expect(buildReviewItems(undefined, [])).toEqual([]);
      expect(buildReviewItems(sampleTestPlan, [])).toEqual([]);
    });
  });

  describe('isExportAllowed (AC2)', () => {
    it('AC2: blocks export (returns false) if any mapping has confidence < 0.85 and human_verified is false', () => {
      expect(isExportAllowed(sampleMappings)).toBe(false);
    });

    it('AC2: allows export (returns true) if all mappings have confidence >= 0.85', () => {
      const highConfidenceMappings: StepLocatorMapping[] = sampleMappings.map((m) => ({
        ...m,
        element_id: m.element_id || 'elem_fallback',
        confidence: 0.9,
        needs_review: false,
      }));

      expect(isExportAllowed(highConfidenceMappings)).toBe(true);
    });

    it('AC2: allows export (returns true) if low confidence mappings are human_verified', () => {
      const humanVerifiedMappings: StepLocatorMapping[] = sampleMappings.map((m) => ({
        ...m,
        element_id: m.element_id || 'elem_verified',
        human_verified: true,
      }));

      expect(isExportAllowed(humanVerifiedMappings)).toBe(true);
    });
  });
});
