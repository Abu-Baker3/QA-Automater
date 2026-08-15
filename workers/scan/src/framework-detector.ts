import * as fs from 'fs';
import * as path from 'path';
import { FrameworkType } from '@qa-automater/types';

export class FrameworkDetector {
  /**
   * Detect framework type from package.json object or raw JSON string.
   * - AC1: Returns 'NEXTJS' if "next" is present in dependencies or devDependencies.
   * - AC2: Returns 'REACT' if "react" is present (and no "next").
   * - AC3: Throws error if unsupported framework (e.g. Vue, Angular) or missing dependencies.
   */
  detectFromPackageJson(input: string | Record<string, unknown>): FrameworkType {
    let pkg: Record<string, unknown>;

    if (typeof input === 'string') {
      try {
        pkg = JSON.parse(input) as Record<string, unknown>;
      } catch (err) {
        throw new Error(`Invalid package.json format: ${(err as Error).message}`);
      }
    } else {
      pkg = input;
    }

    if (!pkg || typeof pkg !== 'object') {
      throw new Error('Unsupported framework: package.json is empty or invalid.');
    }

    const dependencies = (pkg.dependencies as Record<string, string> | undefined) || {};
    const devDependencies = (pkg.devDependencies as Record<string, string> | undefined) || {};

    const deps: Record<string, string> = {
      ...dependencies,
      ...devDependencies,
    };

    // AC1: Next.js detection
    if ('next' in deps) {
      return 'NEXTJS';
    }

    // AC2: React detection (when next is not present)
    if ('react' in deps) {
      return 'REACT';
    }

    // AC3: Unsupported framework (e.g. Vue, Angular, or no React/Next)
    throw new Error('Unsupported framework: only React and Next.js repositories are supported.');
  }

  /**
   * Detect framework type by reading package.json from a target directory path.
   */
  detectFromDirectory(dirPath: string): FrameworkType {
    const pkgPath = path.join(dirPath, 'package.json');

    if (!fs.existsSync(pkgPath)) {
      throw new Error(`package.json not found in repository path '${dirPath}'.`);
    }

    const content = fs.readFileSync(pkgPath, 'utf-8');
    return this.detectFromPackageJson(content);
  }
}
