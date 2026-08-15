import { describe, it, expect, beforeEach } from 'vitest';
import { NextJsAppRouterParser } from './nextjs-app-router-parser';

describe('NextJsAppRouterParser (E5.3)', () => {
  let parser: NextJsAppRouterParser;

  beforeEach(() => {
    parser = new NextJsAppRouterParser();
  });

  describe('pathToRoute (AC1 & AC2)', () => {
    it('should map app/page.tsx to root "/" route', () => {
      expect(parser.pathToRoute('app/page.tsx')).toBe('/');
      expect(parser.pathToRoute('src/app/page.tsx')).toBe('/');
    });

    it('should map app/login/page.tsx to "/login" route (AC1)', () => {
      expect(parser.pathToRoute('app/login/page.tsx')).toBe('/login');
      expect(parser.pathToRoute('src/app/dashboard/settings/page.tsx')).toBe('/dashboard/settings');
    });

    it('should strip route groups in parentheses like (auth) (AC2)', () => {
      expect(parser.pathToRoute('app/(auth)/login/page.tsx')).toBe('/login');
      expect(parser.pathToRoute('src/app/(dashboard)/settings/profile/page.tsx')).toBe(
        '/settings/profile',
      );
      expect(parser.pathToRoute('app/(marketing)/(landing)/page.tsx')).toBe('/');
    });

    it('should handle dynamic routes like [id]', () => {
      expect(parser.pathToRoute('app/users/[id]/page.tsx')).toBe('/users/[id]');
    });

    it('should return null for private folders starting with underscore', () => {
      expect(parser.pathToRoute('app/_components/page.tsx')).toBeNull();
    });

    it('should return null for non-page files', () => {
      expect(parser.pathToRoute('app/login/LoginForm.tsx')).toBeNull();
      expect(parser.pathToRoute('app/layout.tsx')).toBeNull();
    });
  });

  describe('parseRouteFile & parseRepositoryRoutes', () => {
    it('should extract route path, component name, and JSX elements from page file', () => {
      const code = `
import React from 'react';

export function LoginPage() {
  return (
    <div id="login-page">
      <form data-testid="form-login">
        <input type="text" name="username" aria-label="Username" />
        <button type="submit" role="button">Submit</button>
      </form>
    </div>
  );
}
`;

      const route = parser.parseRouteFile('app/(auth)/login/page.tsx', code);

      expect(route).not.toBeNull();
      expect(route!.route_path).toBe('/login');
      expect(route!.file_path).toBe('app/(auth)/login/page.tsx');
      expect(route!.component_name).toBe('LoginPage');

      // Check extracted JSX elements
      expect(route!.jsx_elements).toHaveLength(4); // div, form, input, button
      expect(route!.jsx_elements[1]!.data_testid).toBe('form-login');
      expect(route!.jsx_elements[2]!.aria_label).toBe('Username');
    });

    it('should parse repository files and return total_routes', () => {
      const files = [
        {
          filePath: 'app/page.tsx',
          content: `export function Home() { return <h1>Home</h1>; }`,
        },
        {
          filePath: 'app/(auth)/login/page.tsx',
          content: `export function Login() { return <form data-testid="login"></form>; }`,
        },
        {
          filePath: 'app/components/Button.tsx',
          content: `export function Button() { return <button>Click</button>; }`,
        },
      ];

      const result = parser.parseRepositoryRoutes(files);

      expect(result.total_routes).toBe(2); // app/page.tsx and app/(auth)/login/page.tsx
      expect(result.routes.map((r) => r.route_path)).toContain('/');
      expect(result.routes.map((r) => r.route_path)).toContain('/login');
    });
  });
});
