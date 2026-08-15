import {
  ExtractedJsxElement,
  LocatorCandidate,
  ExtractedLocatorElement,
} from '@qa-automater/types';

export class LocatorExtractor {
  /**
   * Evaluates all locator strategies for a JSX element and ranks candidate locators by stability score.
   */
  public extractCandidates(
    element: ExtractedJsxElement,
    sourceFilePath?: string,
  ): ExtractedLocatorElement {
    const candidates: LocatorCandidate[] = [];

    // 1. testid strategy (data-testid, data-test-id, data-qa, data-cy)
    if (element.data_testid) {
      this.pushCandidate(candidates, {
        strategy: 'testid',
        value: element.data_testid,
        score: 0.98, // AC1: score >= 0.96
        playwright_code: `page.getByTestId('${element.data_testid}')`,
      });
    }

    // 2. label strategy (paired via htmlFor or nesting)
    if (element.label_text) {
      this.pushCandidate(candidates, {
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
      this.pushCandidate(candidates, {
        strategy: 'role_name',
        value: `${computedRole}:${roleName}`,
        score: 0.9, // AC2
        playwright_code: `page.getByRole('${computedRole}', { name: '${roleName}' })`,
      });
    } else if (element.aria_label) {
      this.pushCandidate(candidates, {
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
      this.pushCandidate(candidates, {
        strategy: 'text',
        value: element.text_content,
        score: 0.85, // AC2
        playwright_code: `page.getByText('${element.text_content}')`,
      });
    }

    // 4. placeholder strategy (inputs, textareas)
    if (element.placeholder) {
      this.pushCandidate(candidates, {
        strategy: 'placeholder',
        value: element.placeholder,
        score: 0.8,
        playwright_code: `page.getByPlaceholder('${element.placeholder}')`,
      });
    }

    // 5. id strategy
    if (element.id) {
      const isDynamicId = this.isDynamicHashPattern(element.id);
      const idScore = isDynamicId ? 0.4 : 0.75;
      this.pushCandidate(candidates, {
        strategy: 'id',
        value: element.id,
        score: idScore,
        playwright_code: `page.locator('#${element.id}')`,
      });
    }

    // 6. name attribute strategy
    if (element.name) {
      this.pushCandidate(candidates, {
        strategy: 'name',
        value: element.name,
        score: 0.7,
        playwright_code: `page.locator('[name="${element.name}"]')`,
      });
    }

    // 7. className / CSS strategy
    const classProp = element.props?.find((p) => p.name === 'className' || p.name === 'class');
    if (classProp && classProp.value) {
      const isDynamic = this.isDynamicHashPattern(classProp.value);
      const cssScore = isDynamic ? 0.4 : 0.5; // AC2: penalty applied if dynamic hash (e.g. css-1a2b3c)
      this.pushCandidate(candidates, {
        strategy: 'css',
        value: classProp.value,
        score: cssScore,
        playwright_code: `page.locator('.${classProp.value.split(' ')[0]}')`,
      });
    }

    // 8. Fallback tag strategy
    if (candidates.length === 0) {
      this.pushCandidate(candidates, {
        strategy: 'css',
        value: element.tag_name,
        score: 0.5,
        playwright_code: `page.locator('${element.tag_name}')`,
      });
    }

    // Sort candidates descending by score
    candidates.sort((a, b) => b.score - a.score);

    // Assign rank (1-based) and compute stability tier
    candidates.forEach((candidate, index) => {
      candidate.rank = index + 1;
      candidate.stability_tier = this.getStabilityTier(candidate.score);
    });

    const primary = candidates[0]!;
    const sourceFile = element.source_file || sourceFilePath || 'unknown';
    const sourceLine = element.line_number;

    return {
      tag_name: element.tag_name,
      line_number: element.line_number,
      source_file: sourceFile,
      source_line: sourceLine,
      source_ref: `${sourceFile}:${sourceLine}`,
      candidates,
      primary_candidate: primary,
      stability_tier: primary.stability_tier,
    };
  }

  /**
   * Pushes candidate with calculated stability tier and default rank.
   */
  private pushCandidate(
    candidates: LocatorCandidate[],
    candidate: Omit<LocatorCandidate, 'rank' | 'stability_tier'>,
  ): void {
    candidates.push({
      ...candidate,
      rank: 0,
      stability_tier: this.getStabilityTier(candidate.score),
    });
  }

  /**
   * Computes stability tier based on score.
   */
  public getStabilityTier(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.9) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  }

  /**
   * Detects generated dynamic CSS/ID hash patterns (e.g. css-1a2b3c, sc-bdVaJa, button__1a2b3).
   */
  public isDynamicHashPattern(value: string): boolean {
    const dynamicPatterns = [
      /^css-[a-zA-Z0-9]+$/, // Emotion / MUI hash (e.g. css-1a2b3c)
      /^sc-[a-zA-Z0-9]+$/, // Styled Components hash (e.g. sc-bdVaJa)
      /.*__[a-zA-Z0-9_-]{5,}$/, // CSS Modules hash (e.g. button__1a2b3)
      /^[a-zA-Z0-9]+-[a-zA-Z0-9]{5,}$/, // Generic hash prefix
    ];
    return dynamicPatterns.some((pattern) => pattern.test(value.trim()));
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
