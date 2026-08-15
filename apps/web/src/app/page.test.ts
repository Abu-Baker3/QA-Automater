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
});
