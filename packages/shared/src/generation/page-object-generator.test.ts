import { describe, expect, it } from 'vitest';
import type { StepLocatorMapping, TestPlanIR } from '@qa-automater/types';
import { PageObjectGenerator, generatePlaywrightTestSuite } from './page-object-generator';

describe('PageObjectGenerator (E11.2)', () => {
  const generator = new PageObjectGenerator();

  const mockTestPlan: TestPlanIR = {
    user_story_id: 'story_login_101',
    title: 'Login & Authentication Flow',
    summary: 'Verify login with valid credentials',
    steps: [
      {
        step_id: 'step-1',
        action: 'fill',
        target_description: 'Enter user email address',
        page_hint: '/login',
        expected_outcome: 'Email field populated',
      },
      {
        step_id: 'step-2',
        action: 'fill',
        target_description: 'Enter user password',
        page_hint: '/login',
        expected_outcome: 'Password field populated',
      },
      {
        step_id: 'step-3',
        action: 'click',
        target_description: 'Click Submit Login Button',
        page_hint: '/login',
        expected_outcome: 'Form submitted',
      },
      {
        step_id: 'step-4',
        action: 'assert',
        target_description: 'Assert user dashboard header visible',
        page_hint: '/dashboard',
        expected_outcome: 'Dashboard header rendered',
      },
    ],
  };

  const mockMappings: StepLocatorMapping[] = [
    {
      step_id: 'step-1',
      step_order: 1,
      element_id: 'elem-email',
      confidence: 0.98,
      needs_review: false,
      chosen_locator: {
        strategy: 'testid',
        value: 'input-email',
        score: 0.98,
        playwright_code: "page.getByTestId('input-email')",
        rank: 1,
        stability_tier: 'high',
      },
      candidates: [],
      rationale: 'Exact testid match',
    },
    {
      step_id: 'step-2',
      step_order: 2,
      element_id: 'elem-password',
      confidence: 0.98,
      needs_review: false,
      chosen_locator: {
        strategy: 'testid',
        value: 'input-password',
        score: 0.98,
        playwright_code: "page.getByTestId('input-password')",
        rank: 1,
        stability_tier: 'high',
      },
      candidates: [],
      rationale: 'Exact testid match',
    },
    {
      step_id: 'step-3',
      step_order: 3,
      element_id: 'elem-submit',
      confidence: 0.98,
      needs_review: false,
      chosen_locator: {
        strategy: 'testid',
        value: 'login-submit',
        score: 0.98,
        playwright_code: "page.getByTestId('login-submit')",
        rank: 1,
        stability_tier: 'high',
      },
      candidates: [],
      rationale: 'Exact testid match',
    },
    {
      step_id: 'step-4',
      step_order: 4,
      element_id: 'elem-header',
      confidence: 0.95,
      needs_review: false,
      chosen_locator: {
        strategy: 'role_name',
        value: 'heading:Dashboard Overview',
        score: 0.95,
        playwright_code: "page.getByRole('heading', { name: 'Dashboard Overview' })",
        rank: 1,
        stability_tier: 'high',
      },
      candidates: [],
      rationale: 'Role heading match',
    },
  ];

  describe('AC1: Page Object Class Generation', () => {
    it('Given approved IR with login steps When codegen runs Then LoginPage.page.ts created with locator getters', () => {
      const result = generator.generate(mockTestPlan, mockMappings, {
        pageName: 'LoginPage',
      });

      expect(result.pageObjects).toHaveLength(1);
      const po = result.pageObjects[0]!;

      expect(po.className).toBe('LoginPage');
      expect(po.fileName).toBe('LoginPage.page.ts');
      expect(po.filePath).toBe('pages/LoginPage.page.ts');

      // Verify getter definitions
      expect(po.getters).toHaveLength(4);
      expect(po.content).toContain('export class LoginPage');
      expect(po.content).toContain('constructor(page: Page)');
      expect(po.content).toContain('get emailAddressInput(): Locator');
      expect(po.content).toContain("return this.page.getByTestId('input-email')");
      expect(po.content).toContain('get passwordInput(): Locator');
      expect(po.content).toContain("return this.page.getByTestId('input-password')");
      expect(po.content).toContain('get submitLoginButton(): Locator');
      expect(po.content).toContain("return this.page.getByTestId('login-submit')");
    });

    it('supports standalone helper generatePlaywrightTestSuite', () => {
      const result = generatePlaywrightTestSuite(mockTestPlan, mockMappings);
      expect(result.pageObjects[0]?.className).toContain('Page');
      expect(result.specFile.fileName).toContain('.spec.ts');
    });
  });

  describe('AC2: Spec File Generation Without Hardcoded Selectors', () => {
    it('Given spec file When generated Then no hardcoded selectors in spec — only PO method/getter calls', () => {
      const result = generator.generate(mockTestPlan, mockMappings, {
        pageName: 'LoginPage',
      });

      const spec = result.specFile;
      expect(spec.fileName).toBe('login-authentication-flow.spec.ts');
      expect(spec.filePath).toBe('tests/login-authentication-flow.spec.ts');
      expect(spec.content).toContain("import { LoginPage } from '../pages/LoginPage.page';");
      expect(spec.content).toContain('const loginPage = new LoginPage(page);');

      // Verify actions use PO getters exclusively
      expect(spec.content).toContain('await loginPage.emailAddressInput.fill(');
      expect(spec.content).toContain('await loginPage.passwordInput.fill(');
      expect(spec.content).toContain('await loginPage.submitLoginButton.click();');
      expect(spec.content).toContain(
        'await expect(loginPage.dashboardHeaderVisibleElement).toBeVisible();',
      );

      // Verify NO raw selectors appear in the spec body

      expect(spec.content).not.toContain("getByTestId('input-email')");
      expect(spec.content).not.toContain("getByTestId('input-password')");
      expect(spec.content).not.toContain("getByTestId('login-submit')");
      expect(spec.content).not.toContain("getByRole('heading'");
    });
  });
});
