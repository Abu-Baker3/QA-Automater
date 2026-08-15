import {
  ExtractedJsxElement,
  LocatorCandidate,
  ExtractedLocatorElement,
} from '@qa-automater/types';

export class LocatorExtractor {
  /**
   * Evaluates all locator strategies for a JSX element and ranks candidate locators by stability score.
   */
  public extractCandidates(element: ExtractedJsxElement): ExtractedLocatorElement {
    const candidates: LocatorCandidate[] = [];

    // 1. testid strategy (data-testid, data-test-id, data-qa, data-cy)
    if (element.data_testid) {
      candidates.push({
        strategy: 'testid',
        value: element.data_testid,
        score: 0.98, // AC1: score >= 0.96
        playwright_code: `page.getByTestId('${element.data_testid}')`,
      });
    }

    // 2. label strategy (paired via htmlFor or nesting)
    if (element.label_text) {
      candidates.push({
        strategy: 'label',
        value: element.label_text,
        score: 0.92, // AC1: rank <= 2 (behind testid 0.98, ahead of role_name 0.90)
        playwright_code: `page.getByLabel('${element.label_text}')`,
      });
    }

    // 3. role + name / aria-label strategy
    const roleName = element.aria_label || element.text_content;
    const computedRole = element.role || this.inferRoleFromTagName(element.tag_name, element.type);

    if (computedRole && roleName) {
      candidates.push({
        strategy: 'role_name',
        value: `${computedRole}:${roleName}`,
        score: 0.9, // AC2
        playwright_code: `page.getByRole('${computedRole}', { name: '${roleName}' })`,
      });
    } else if (element.aria_label) {
      candidates.push({
        strategy: 'role_name',
        value: element.aria_label,
        score: 0.88,
        playwright_code: computedRole
          ? `page.getByRole('${computedRole}', { name: '${element.aria_label}' })`
          : `page.getByLabel('${element.aria_label}')`,
      });
    }

    // 3. static text strategy (buttons, links, labels, headings)
    if (element.text_content) {
      candidates.push({
        strategy: 'text',
        value: element.text_content,
        score: 0.85, // AC2
        playwright_code: `page.getByText('${element.text_content}')`,
      });
    }

    // 4. placeholder strategy (inputs, textareas)
    if (element.placeholder) {
      candidates.push({
        strategy: 'placeholder',
        value: element.placeholder,
        score: 0.8,
        playwright_code: `page.getByPlaceholder('${element.placeholder}')`,
      });
    }

    // 5. id strategy
    if (element.id) {
      candidates.push({
        strategy: 'id',
        value: element.id,
        score: 0.75,
        playwright_code: `page.locator('#${element.id}')`,
      });
    }

    // 6. name attribute strategy
    if (element.name) {
      candidates.push({
        strategy: 'name',
        value: element.name,
        score: 0.7,
        playwright_code: `page.locator('[name="${element.name}"]')`,
      });
    }

    // 7. Fallback tag/css strategy
    if (candidates.length === 0) {
      candidates.push({
        strategy: 'css',
        value: element.tag_name,
        score: 0.5,
        playwright_code: `page.locator('${element.tag_name}')`,
      });
    }

    // Sort candidates descending by score
    candidates.sort((a, b) => b.score - a.score);

    return {
      tag_name: element.tag_name,
      line_number: element.line_number,
      candidates,
      primary_candidate: candidates[0]!,
    };
  }

  /**
   * Infers default ARIA role based on HTML tag name and input type.
   */
  private inferRoleFromTagName(tagName: string, inputType?: string): string | undefined {
    switch (tagName.toLowerCase()) {
      case 'button':
        return 'button';
      case 'a':
        return 'link';
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return 'heading';
      case 'form':
        return 'form';
      case 'img':
        return 'img';
      case 'input':
        if (inputType === 'checkbox') return 'checkbox';
        if (inputType === 'radio') return 'radio';
        if (inputType === 'submit' || inputType === 'button') return 'button';
        return 'textbox';
      case 'textarea':
        return 'textbox';
      case 'select':
        return 'combobox';
      default:
        return undefined;
    }
  }
}
