import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FrameworkDetector } from './framework-detector';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('FrameworkDetector (E5.1)', () => {
  let detector: FrameworkDetector;
  let tempDir: string;

  beforeEach(() => {
    detector = new FrameworkDetector();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fw-detect-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('AC1: Next.js Framework Detection', () => {
    it('should detect NEXTJS when "next" is in dependencies', () => {
      const pkg = {
        name: 'my-next-app',
        dependencies: {
          next: '^14.2.0',
          react: '^18.3.0',
          'react-dom': '^18.3.0',
        },
      };

      const result = detector.detectFromPackageJson(pkg);
      expect(result).toBe('NEXTJS');
    });

    it('should detect NEXTJS when "next" is in devDependencies', () => {
      const pkg = {
        name: 'my-next-app-dev',
        devDependencies: {
          next: '15.0.0',
        },
      };

      const result = detector.detectFromPackageJson(pkg);
      expect(result).toBe('NEXTJS');
    });
  });

  describe('AC2: React Framework Detection', () => {
    it('should detect REACT when "react" is in dependencies and "next" is absent', () => {
      const pkg = {
        name: 'my-react-app',
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
        },
      };

      const result = detector.detectFromPackageJson(pkg);
      expect(result).toBe('REACT');
    });

    it('should detect REACT when "react" is in devDependencies and "next" is absent', () => {
      const pkg = {
        name: 'my-react-lib',
        devDependencies: {
          react: '^18.0.0',
        },
      };

      const result = detector.detectFromPackageJson(pkg);
      expect(result).toBe('REACT');
    });
  });

  describe('AC3: Unsupported Framework & Error Handling', () => {
    it('should throw error for Vue package.json listing supported frameworks', () => {
      const pkg = {
        name: 'my-vue-app',
        dependencies: {
          vue: '^3.4.0',
        },
      };

      expect(() => detector.detectFromPackageJson(pkg)).toThrow(
        'Unsupported framework: only React and Next.js repositories are supported.',
      );
    });

    it('should throw error for Angular package.json', () => {
      const pkg = {
        name: 'my-angular-app',
        dependencies: {
          '@angular/core': '^17.0.0',
        },
      };

      expect(() => detector.detectFromPackageJson(pkg)).toThrow(
        'Unsupported framework: only React and Next.js repositories are supported.',
      );
    });

    it('should throw error when package.json has no dependencies or devDependencies', () => {
      const pkg = {
        name: 'plain-node-script',
      };

      expect(() => detector.detectFromPackageJson(pkg)).toThrow(
        'Unsupported framework: only React and Next.js repositories are supported.',
      );
    });

    it('should throw error for invalid JSON string input', () => {
      expect(() => detector.detectFromPackageJson('{ invalid json')).toThrow(
        'Invalid package.json format',
      );
    });
  });

  describe('Directory-based Detection', () => {
    it('should detect framework from directory package.json file', () => {
      const pkgPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(
        pkgPath,
        JSON.stringify({ dependencies: { next: '14.0.0', react: '18.0.0' } }),
      );

      const result = detector.detectFromDirectory(tempDir);
      expect(result).toBe('NEXTJS');
    });

    it('should throw error if package.json does not exist in target directory', () => {
      expect(() => detector.detectFromDirectory(tempDir)).toThrow('package.json not found');
    });
  });
});
