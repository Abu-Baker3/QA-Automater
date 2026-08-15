import { describe, it, expect, beforeEach } from 'vitest';
import { FormLabelAssociator } from './form-label-associator';
import { ExtractedJsxElement } from '@qa-automater/types';

describe('FormLabelAssociator (E6.2)', () => {
  let associator: FormLabelAssociator;

  beforeEach(() => {
    associator = new FormLabelAssociator();
  });

  describe('AC1: label htmlFor <-> input id Pairing & Rank <= 2', () => {
    it('should pair label htmlFor="email" with input id="email" and assign label locator rank <= 2', () => {
      const elements: ExtractedJsxElement[] = [
        {
          tag_name: 'label',
          line_number: 5,
          html_for: 'email',
          text_content: 'Email Address',
        },
        {
          tag_name: 'input',
          line_number: 6,
          id: 'email',
          type: 'email',
          name: 'email',
        },
      ];

      const paired = associator.pairLabelsWithInputs(elements);

      const inputElement = paired.find((e) => e.tag_name === 'input');
      expect(inputElement).toBeDefined();
      expect(inputElement!.label_text).toBe('Email Address');

      // Check locators on input
      const locators = inputElement!.locators;
      const labelCandidate = locators.candidates.find((c) => c.strategy === 'label');

      expect(labelCandidate).toBeDefined();
      expect(labelCandidate!.value).toBe('Email Address');
      expect(labelCandidate!.score).toBe(0.92);
      expect(labelCandidate!.playwright_code).toBe("page.getByLabel('Email Address')");

      // Verify rank <= 2 (1st or 2nd place in sorted candidates)
      const rank = locators.candidates.findIndex((c) => c.strategy === 'label') + 1;
      expect(rank).toBeLessThanOrEqual(2);
    });
  });

  describe('AC2: aria-label without <label> Fallback to role+name', () => {
    it('should generate role+name candidate when input has aria-label="Search Query" without a label tag', () => {
      const elements: ExtractedJsxElement[] = [
        {
          tag_name: 'input',
          line_number: 10,
          aria_label: 'Search Query',
          type: 'text',
        },
      ];

      const paired = associator.pairLabelsWithInputs(elements);

      const inputElement = paired[0]!;
      expect(inputElement.label_text).toBeUndefined();

      const locators = inputElement.locators;
      const roleNameCandidate = locators.candidates.find((c) => c.strategy === 'role_name');

      expect(roleNameCandidate).toBeDefined();
      expect(roleNameCandidate!.playwright_code).toBe(
        "page.getByRole('textbox', { name: 'Search Query' })",
      );
      expect(locators.primary_candidate.strategy).toBe('role_name');
    });
  });
});
