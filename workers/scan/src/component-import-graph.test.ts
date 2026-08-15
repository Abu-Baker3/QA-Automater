import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentImportGraphBuilder } from './component-import-graph';
import { AppRouterRoute } from '@qa-automater/types';

describe('ComponentImportGraphBuilder (E5.4)', () => {
  let builder: ComponentImportGraphBuilder;

  beforeEach(() => {
    builder = new ComponentImportGraphBuilder();
  });

  describe('AC1: Component Import Graph & Edge Generation', () => {
    it('should build parent-child edges when Page imports LoginForm and LoginForm imports Button', () => {
      const files = [
        {
          filePath: 'app/login/page.tsx',
          content: `
import React from 'react';
import { LoginForm } from '../../components/LoginForm';

export function LoginPage() {
  return (
    <div id="login-page">
      <LoginForm />
    </div>
  );
}
`,
        },
        {
          filePath: 'components/LoginForm.tsx',
          content: `
import React from 'react';
import CustomButton from './Button';

export function LoginForm() {
  return (
    <form data-testid="form-login">
      <input data-testid="input-email" type="email" />
      <CustomButton />
    </form>
  );
}
`,
        },
        {
          filePath: 'components/Button.tsx',
          content: `
import React from 'react';

export default function CustomButton() {
  return <button data-testid="btn-submit">Submit</button>;
}
`,
        },
      ];

      const routes: AppRouterRoute[] = [
        {
          route_path: '/login',
          file_path: 'app/login/page.tsx',
          component_name: 'LoginPage',
          jsx_elements: [],
        },
      ];

      const graph = builder.buildGraph(files, routes);

      // Verify Nodes
      expect(Object.keys(graph.nodes)).toContain('app/login/page.tsx:LoginPage');
      expect(Object.keys(graph.nodes)).toContain('components/LoginForm.tsx:LoginForm');
      expect(Object.keys(graph.nodes)).toContain('components/Button.tsx:CustomButton');

      expect(graph.nodes['app/login/page.tsx:LoginPage']!.is_page).toBe(true);
      expect(graph.nodes['app/login/page.tsx:LoginPage']!.route_path).toBe('/login');

      // Verify Edges (AC1: page -> component -> child elements)
      expect(graph.edges).toHaveLength(2);
      const pageToFormEdge = graph.edges.find(
        (e) =>
          e.parent_id === 'app/login/page.tsx:LoginPage' &&
          e.child_id === 'components/LoginForm.tsx:LoginForm',
      );
      expect(pageToFormEdge).toBeDefined();

      const formToButtonEdge = graph.edges.find(
        (e) =>
          e.parent_id === 'components/LoginForm.tsx:LoginForm' &&
          e.child_id === 'components/Button.tsx:CustomButton',
      );
      expect(formToButtonEdge).toBeDefined();
    });

    it('should resolve path alias imports (@/components/Header)', () => {
      const files = [
        {
          filePath: 'app/page.tsx',
          content: `
import { Header } from '@/components/Header';
export function HomePage() { return <Header />; }
`,
        },
        {
          filePath: 'components/Header.tsx',
          content: `export function Header() { return <header>Logo</header>; }`,
        },
      ];

      const routes: AppRouterRoute[] = [
        {
          route_path: '/',
          file_path: 'app/page.tsx',
          component_name: 'HomePage',
          jsx_elements: [],
        },
      ];

      const graph = builder.buildGraph(files, routes);

      expect(graph.edges).toHaveLength(1);
      expect(graph.edges[0]!.parent_id).toBe('app/page.tsx:HomePage');
      expect(graph.edges[0]!.child_id).toBe('components/Header.tsx:Header');
    });
  });

  describe('AC2: Barrel Re-exports & Circular Import Loop Depth Safeguard', () => {
    it('should stop gracefully without crashing when circular dependencies or deep barrel re-exports exist', () => {
      const depthLimitedBuilder = new ComponentImportGraphBuilder(3); // MAX_DEPTH = 3

      const files = [
        {
          filePath: 'app/page.tsx',
          content: `
import { ComponentA } from './ComponentA';
export function Page() { return <ComponentA />; }
`,
        },
        {
          filePath: 'app/ComponentA.tsx',
          content: `
import { ComponentB } from './ComponentB';
export function ComponentA() { return <ComponentB />; }
`,
        },
        {
          filePath: 'app/ComponentB.tsx',
          content: `
import { ComponentA } from './ComponentA';
export function ComponentB() { return <ComponentA />; }
`,
        },
      ];

      // Execution: Should complete cleanly without stack overflow or infinite recursion
      const graph = depthLimitedBuilder.buildGraph(files, [
        { route_path: '/', file_path: 'app/page.tsx', component_name: 'Page', jsx_elements: [] },
      ]);

      expect(graph.nodes['app/page.tsx:Page']).toBeDefined();
      expect(graph.edges.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeLessThanOrEqual(5);
    });
  });
});
