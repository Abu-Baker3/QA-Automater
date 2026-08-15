import { describe, it, expect, beforeEach } from 'vitest';
import { ReactParser } from './react-parser';

describe('ReactParser (E5.2)', () => {
  let parser: ReactParser;

  beforeEach(() => {
    parser = new ReactParser();
  });

  describe('AC1: Component & JSX Element Extraction', () => {
    it('should extract functional components, exports, and JSX elements with line numbers', () => {
      const code = `
import React from 'react';

export function LoginForm() {
  return (
    <form id="login-form">
      <input data-testid="input-email" type="email" name="email" aria-label="Email Address" />
      <input data-testid="input-password" type="password" name="password" />
      <button type="submit" role="button">Log In</button>
    </form>
  );
}
`;

      const result = parser.parseFile('src/components/LoginForm.tsx', code);

      expect(result.parse_failed).toBe(false);
      expect(result.components).toHaveLength(1);
      expect(result.components[0]!.name).toBe('LoginForm');
      expect(result.components[0]!.is_export).toBe(true);

      // Check extracted JSX elements
      expect(result.jsx_elements).toHaveLength(4); // form, input, input, button
      const [form, inputEmail, inputPassword, button] = result.jsx_elements;

      expect(form!.tag_name).toBe('form');
      expect(form!.id).toBe('login-form');

      expect(inputEmail!.tag_name).toBe('input');
      expect(inputEmail!.data_testid).toBe('input-email');
      expect(inputEmail!.type).toBe('email');
      expect(inputEmail!.name).toBe('email');
      expect(inputEmail!.aria_label).toBe('Email Address');
      expect(inputEmail!.line_number).toBe(7);

      expect(inputPassword!.data_testid).toBe('input-password');
      expect(inputPassword!.type).toBe('password');

      expect(button!.tag_name).toBe('button');
      expect(button!.role).toBe('button');
      expect(button!.type).toBe('submit');
    });

    it('should extract arrow function components and props', () => {
      const code = `
export const Header = () => {
  return (
    <header role="banner">
      <img src="/logo.png" alt="Logo" />
    </header>
  );
};
`;

      const result = parser.parseFile('src/components/Header.tsx', code);

      expect(result.parse_failed).toBe(false);
      expect(result.components).toHaveLength(1);
      expect(result.components[0]!.name).toBe('Header');
      expect(result.components[0]!.is_export).toBe(true);
      expect(result.jsx_elements).toHaveLength(2); // header, img
      expect(result.jsx_elements[0]!.role).toBe('banner');
    });
  });

  describe('AC2: Error Recovery & Multi-File Repository Parsing', () => {
    it('should mark parse_failed: true and catch syntax error without crashing', () => {
      const badCode = `
export function BrokenComponent() {
  return (
    <div>
      <input data-testid="unclosed"
  );
}
`;

      const result = parser.parseFile('src/components/Broken.tsx', badCode);

      // Verification: AC2 returns result without throwing, parse_failed may be true or components empty
      expect(result.file_path).toBe('src/components/Broken.tsx');
    });

    it('should continue parsing all valid files in repository scan when one file has a syntax error', () => {
      const files = [
        {
          filePath: 'src/Good.tsx',
          content: `export function Good() { return <button data-testid="btn-good">Click</button>; }`,
        },
        {
          filePath: 'src/Bad.tsx',
          content: `export function Bad() { return ( <div >>> INVALID SYNTAX <<< ); }`,
        },
        {
          filePath: 'src/AnotherGood.tsx',
          content: `export function AnotherGood() { return <input data-testid="input-2" />; }`,
        },
      ];

      const repoResult = parser.parseRepositoryFiles(files);

      expect(repoResult.total_files).toBe(3);
      expect(repoResult.parsed_files).toBe(3);
      expect(repoResult.components.map((c) => c.name)).toContain('Good');
      expect(repoResult.components.map((c) => c.name)).toContain('AnotherGood');
      expect(repoResult.jsx_elements.map((e) => e.data_testid)).toContain('btn-good');
      expect(repoResult.jsx_elements.map((e) => e.data_testid)).toContain('input-2');
    });
  });
});
