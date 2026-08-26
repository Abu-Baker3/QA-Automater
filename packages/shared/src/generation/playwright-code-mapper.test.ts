import { describe, expect, it } from 'vitest';
import { PlaywrightCodeMapper, mapLocatorToPlaywright } from './playwright-code-mapper';

describe('PlaywrightCodeMapper (E11.1)', () => {
  const mapper = new PlaywrightCodeMapper();

  describe('AC1: testid strategy mapping', () => {
    it("Given testid strategy When mapped Then outputs page.getByTestId('...')", () => {
      const code = mapper.map('testid', 'login-submit');
      expect(code).toBe("page.getByTestId('login-submit')");
    });

    it('handles helper function mapLocatorToPlaywright', () => {
      const code = mapLocatorToPlaywright('testid', 'input-email');
      expect(code).toBe("page.getByTestId('input-email')");
    });

    it('escapes single quotes in testid values', () => {
      const code = mapper.map('testid', "user's-button");
      expect(code).toBe("page.getByTestId('user\\'s-button')");
    });
  });

  describe('AC2: role_name strategy mapping', () => {
    it("Given role+name When mapped Then outputs page.getByRole('...', { name: '...' })", () => {
      const code = mapper.map('role_name', 'button:Sign In');
      expect(code).toBe("page.getByRole('button', { name: 'Sign In' })");
    });

    it('supports explicit options overrides for role and name', () => {
      const code = mapper.map('role_name', 'submit-btn', {
        role: 'button',
        name: 'Submit Order',
      });
      expect(code).toBe("page.getByRole('button', { name: 'Submit Order' })");
    });

    it('supports exact match option', () => {
      const code = mapper.map('role_name', 'textbox:Email Address', { exact: true });
      expect(code).toBe("page.getByRole('textbox', { name: 'Email Address', exact: true })");
    });

    it('handles role-only values without colon', () => {
      const code = mapper.map('role_name', 'heading');
      expect(code).toBe("page.getByText('heading')");
    });
  });

  describe('Additional strategy mappings', () => {
    it('maps label strategy', () => {
      const code = mapper.map('label', 'Password');
      expect(code).toBe("page.getByLabel('Password')");
    });

    it('maps text strategy', () => {
      const code = mapper.map('text', 'Welcome Back');
      expect(code).toBe("page.getByText('Welcome Back')");
    });

    it('maps placeholder strategy', () => {
      const code = mapper.map('placeholder', 'Enter your email');
      expect(code).toBe("page.getByPlaceholder('Enter your email')");
    });

    it('maps id strategy', () => {
      const codeWithHash = mapper.map('id', '#main-container');
      const codeWithoutHash = mapper.map('id', 'main-container');
      expect(codeWithHash).toBe("page.locator('#main-container')");
      expect(codeWithoutHash).toBe("page.locator('#main-container')");
    });

    it('maps name attribute strategy', () => {
      const code = mapper.map('name', 'username');
      expect(code).toBe('page.locator(\'[name="username"]\')');
    });

    it('maps css strategy', () => {
      const rawCss = mapper.map('css', '.btn-primary');
      const fullPlaywrightCode = mapper.map('css', "page.locator('.btn-primary')");
      expect(rawCss).toBe("page.locator('.btn-primary')");
      expect(fullPlaywrightCode).toBe("page.locator('.btn-primary')");
    });
  });
});
