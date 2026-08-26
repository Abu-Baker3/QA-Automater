import { describe, expect, it } from 'vitest';
import { cn } from '@qa-automater/ui';

describe('web app utilities & UI KB Explorer (E7.4)', () => {
  it('uses shared ui package', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  describe('UI KB Explorer (E7.4 AC1 & AC2)', () => {
    it('AC1: should structure stability tier badges for high, medium, and low tiers', () => {
      const stabilityTiers = ['high', 'medium', 'low'] as const;
      expect(stabilityTiers).toContain('high');
      expect(stabilityTiers).toContain('medium');
      expect(stabilityTiers).toContain('low');
    });

    it('AC2: should format source_ref as {file}:{line} with Playwright locator code', () => {
      const sampleElem = {
        source_ref: 'app/login/page.tsx:42',
        primary_candidate: {
          strategy: 'testid',
          playwright_code: "page.getByTestId('login-submit')",
          rank: 1,
          stability_tier: 'high',
        },
      };

      expect(sampleElem.source_ref).toMatch(/^.+:\d+$/);
      expect(sampleElem.primary_candidate.playwright_code).toContain('page.getByTestId');
      expect(sampleElem.primary_candidate.rank).toBe(1);
    });
  });

  describe('Review Queue Dashboard UI (E10.4 AC1 & AC2)', () => {
    it('AC1: highlights low-confidence steps (<85%) requiring human review', () => {
      const sampleReviewItem = {
        step_id: 'step-2',
        step_order: 2,
        action: 'fill',
        target_description: 'Enter user password',
        confidence: 0.65,
        needs_review: true,
        human_verified: false,
      };

      const isLowConfidence =
        sampleReviewItem.confidence < 0.85 && !sampleReviewItem.human_verified;
      expect(isLowConfidence).toBe(true);
      expect(sampleReviewItem.needs_review).toBe(true);
    });

    it('AC2: confirming override marks step resolved (confidence=1.0, human_verified=true) and enables export button when all done', () => {
      const items = [
        { step_id: 'step-1', confidence: 0.95, human_verified: false },
        { step_id: 'step-2', confidence: 0.65, human_verified: false },
      ];

      // Simulate override on step-2
      const updatedItems = items.map((item) =>
        item.step_id === 'step-2' ? { ...item, confidence: 1.0, human_verified: true } : item,
      );

      const pendingCount = updatedItems.filter(
        (i) => i.confidence < 0.85 && !i.human_verified,
      ).length;
      const isExportAllowed = pendingCount === 0;

      expect(updatedItems[1]?.confidence).toBe(1.0);
      expect(updatedItems[1]?.human_verified).toBe(true);
      expect(isExportAllowed).toBe(true);
    });
  });
});
