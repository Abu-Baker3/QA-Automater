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

  describe('E6.3: Compute Locator Stability Scores', () => {
    it('AC1: should assign rank=1 and stability_tier="high" when data-testid is present', () => {
      const element: ExtractedJsxElement = {
        tag_name: 'button',
        line_number: 10,
        data_testid: 'submit-btn',
        text_content: 'Submit',
      };

      const result = extractor.extractCandidates(element);

      expect(result.primary_candidate.strategy).toBe('testid');
      expect(result.primary_candidate.rank).toBe(1);
      expect(result.primary_candidate.stability_tier).toBe('high');
      expect(result.stability_tier).toBe('high');
    });

    it('AC2: should apply penalty and assign stability_tier="low" for generated dynamic CSS class css-1a2b3c', () => {
      const element: ExtractedJsxElement = {
        tag_name: 'div',
        line_number: 25,
        props: [{ name: 'className', value: 'css-1a2b3c' }],
      };

      const result = extractor.extractCandidates(element);

      const cssCandidate = result.candidates.find((c) => c.strategy === 'css');
      expect(cssCandidate).toBeDefined();
      expect(cssCandidate!.score).toBeLessThan(0.6);
      expect(cssCandidate!.stability_tier).toBe('low');
      expect(result.stability_tier).toBe('low');
    });

    it('should correctly evaluate high, medium, and low stability tiers based on score thresholds', () => {
      expect(extractor.getStabilityTier(0.98)).toBe('high');
      expect(extractor.getStabilityTier(0.9)).toBe('high');
      expect(extractor.getStabilityTier(0.85)).toBe('medium');
      expect(extractor.getStabilityTier(0.6)).toBe('medium');
      expect(extractor.getStabilityTier(0.5)).toBe('low');
      expect(extractor.getStabilityTier(0.4)).toBe('low');
    });
  });

  describe('E6.4: Persist UI Elements with Source Traceability', () => {
    it('AC1: should populate source_file, source_line, and source_ref on extracted locator element', () => {
      const element: ExtractedJsxElement = {
        tag_name: 'button',
        line_number: 15,
        source_file: 'src/components/LoginButton.tsx',
        data_testid: 'login-btn',
      };

      const result = extractor.extractCandidates(element);

      expect(result.source_file).toBe('src/components/LoginButton.tsx');
      expect(result.source_line).toBe(15);
      expect(result.source_ref).toBe('src/components/LoginButton.tsx:15');
    });
  });
});
