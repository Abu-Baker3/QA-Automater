import { describe, expect, it } from 'vitest';
import type { PlaywrightCodegenOutput } from '@qa-automater/types';
import { CodeValidator, validateCodegenOutput } from './code-validator';

describe('CodeValidator (E11.4)', () => {
  const validator = new CodeValidator();

  const validOutput: PlaywrightCodegenOutput = {
    pageObjects: [
      {
        className: 'LoginPage',
        fileName: 'LoginPage.page.ts',
        filePath: 'pages/LoginPage.page.ts',
        content: `import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  get emailInput(): Locator {
    return this.page.getByTestId('input-email');
  }

  get submitButton(): Locator {
    return this.page.getByTestId('login-submit');
  }
}
`,
        getters: [
          {
            name: 'emailInput',
            playwright_code: "page.getByTestId('input-email')",
            target_description: 'User email input',
            step_order: 1,
          },
        ],
      },
    ],
    specFile: {
      fileName: 'login.spec.ts',
      filePath: 'tests/login.spec.ts',
      pageObjectImports: ['LoginPage'],
      content: `import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.page';

test.describe('Login Suite', () => {
  test('login flow', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.emailInput.fill('user@example.com');
    await loginPage.submitButton.click();
    await expect(loginPage.submitButton).toBeVisible();
  });
});
`,
    },
  };

  describe('AC1: ESLint Custom Rules Validation', () => {
    it('Given valid generated files When validator runs Then valid=true and 0 diagnostics returned', () => {
      const result = validator.validate(validOutput);

      expect(result.valid).toBe(true);
      expect(result.diagnostics).toHaveLength(0);
      expect(result.passed_rules).toContain('no-xpath');
      expect(result.passed_rules).toContain('po-encapsulation');
      expect(result.passed_rules).toContain('ts-syntax-error');
    });

    it('Given code containing XPath selectors When validator runs Then flags no-xpath error', () => {
      const xpathOutput: PlaywrightCodegenOutput = {
        ...validOutput,
        specFile: {
          ...validOutput.specFile,
          content: `import { test } from '@playwright/test';
test('bad xpath', async ({ page }) => {
  await page.locator('xpath=//button[@id="submit"]').click();
});`,
        },
      };

      const result = validator.validate(xpathOutput);

      expect(result.valid).toBe(false);
      const xpathDiag = result.diagnostics.find((d) => d.rule_id === 'no-xpath');
      expect(xpathDiag).toBeDefined();
      expect(xpathDiag?.message).toContain('XPath locators are prohibited');
      expect(result.passed_rules).not.toContain('no-xpath');
    });

    it('Given spec file with direct raw Playwright locators When validator runs Then flags po-encapsulation error', () => {
      const unencapsulatedOutput: PlaywrightCodegenOutput = {
        ...validOutput,
        specFile: {
          ...validOutput.specFile,
          content: `import { test } from '@playwright/test';
test('unencapsulated locator', async ({ page }) => {
  await page.getByTestId('raw-button').click();
});`,
        },
      };

      const result = validator.validate(unencapsulatedOutput);

      expect(result.valid).toBe(false);
      const poDiag = result.diagnostics.find((d) => d.rule_id === 'po-encapsulation');
      expect(poDiag).toBeDefined();
      expect(poDiag?.message).toContain('Encapsulate all locators within Page Object getters');
      expect(result.passed_rules).not.toContain('po-encapsulation');
    });
  });

  describe('AC2: TypeScript Compiler Syntax Diagnostics', () => {
    it('Given code with syntax error (missing closing brace/bracket) When validator runs Then flags ts-syntax-error', () => {
      const syntaxErrorOutput: PlaywrightCodegenOutput = {
        ...validOutput,
        specFile: {
          ...validOutput.specFile,
          content: `import { test } from '@playwright/test';
test('broken syntax', async ({ page }) => {
  await page.goto('/login'
});`,
        },
      };

      const result = validator.validate(syntaxErrorOutput);

      expect(result.valid).toBe(false);
      const syntaxDiag = result.diagnostics.find((d) => d.rule_id === 'ts-syntax-error');
      expect(syntaxDiag).toBeDefined();
      expect(syntaxDiag?.message).toContain('TypeScript Syntax Error');
      expect(result.passed_rules).not.toContain('ts-syntax-error');
    });

    it('supports standalone helper validateCodegenOutput', () => {
      const result = validateCodegenOutput(validOutput);
      expect(result.valid).toBe(true);
    });
  });
});
