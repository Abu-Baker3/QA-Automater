import { describe, it, expect, beforeEach } from 'vitest';
import { LocatorExtractor } from './locator-extractor';
import { ExtractedJsxElement } from '@qa-automater/types';

describe('LocatorExtractor (E6.1)', () => {
  let extractor: LocatorExtractor;

  beforeEach(() => {
    extractor = new LocatorExtractor();
  });

  describe('AC1: testid Strategy & Scoring', () => {
    it('should assign strategy=testid and score >= 0.96 when data-testid="email" is present', () => {
      const element: ExtractedJsxElement = {
        tag_name: 'input',
        line_number: 12,
        data_testid: 'email',
        type: 'email',
        name: 'email',
      };

      const result = extractor.extractCandidates(element);

      expect(result.primary_candidate.strategy).toBe('testid');
      expect(result.primary_candidate.value).toBe('email');
      expect(result.primary_candidate.score).toBeGreaterThanOrEqual(0.96);
      expect(result.primary_candidate.playwright_code).toBe("page.getByTestId('email')");
    });
  });

  describe('AC2: Static Text & Role+Name Strategy', () => {
    it('should generate static_text and role+name candidates for a button with static text "Sign In"', () => {
      const element: ExtractedJsxElement = {
        tag_name: 'button',
        line_number: 18,
        text_content: 'Sign In',
        type: 'submit',
      };

      const result = extractor.extractCandidates(element);

      const roleNameCandidate = result.candidates.find((c) => c.strategy === 'role_name');
      const textCandidate = result.candidates.find((c) => c.strategy === 'text');

      expect(roleNameCandidate).toBeDefined();
      expect(roleNameCandidate!.playwright_code).toBe(
        "page.getByRole('button', { name: 'Sign In' })",
      );
      expect(roleNameCandidate!.score).toBe(0.9);

      expect(textCandidate).toBeDefined();
      expect(textCandidate!.playwright_code).toBe("page.getByText('Sign In')");
      expect(textCandidate!.score).toBe(0.85);
    });

    it('should extract placeholder and id locator candidates for inputs', () => {
      const element: ExtractedJsxElement = {
        tag_name: 'input',
        line_number: 22,
        placeholder: 'Enter your email address',
        id: 'user-email',
      };

      const result = extractor.extractCandidates(element);

      expect(result.candidates.map((c) => c.strategy)).toContain('placeholder');
      expect(result.candidates.map((c) => c.strategy)).toContain('id');
      expect(result.primary_candidate.strategy).toBe('placeholder');
      expect(result.primary_candidate.playwright_code).toBe(
        "page.getByPlaceholder('Enter your email address')",
      );
    });
  });
});
