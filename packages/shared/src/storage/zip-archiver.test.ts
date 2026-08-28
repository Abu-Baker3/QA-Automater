import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { createTestZipArchive, generateDefaultReadmeWalkthrough } from './zip-archiver';

describe('ZipArchiver (E12.2)', () => {
  it('AC1 & AC2: bundles test specs, page objects, README, and .env.example into a ZIP archive', async () => {
    const archiveBuffer = await createTestZipArchive({
      specFiles: [
        {
          filename: 'login-authentication-flow.spec.ts',
          content:
            'import { test, expect } from "@playwright/test"; test("login", async () => {});',
        },
      ],
      pageObjectFiles: [
        {
          filename: 'LoginPage.page.ts',
          content: 'export class LoginPage { constructor(public page: any) {} }',
        },
      ],
    });

    expect(archiveBuffer).toBeInstanceOf(Buffer);
    expect(archiveBuffer.length).toBeGreaterThan(0);

    // Unzip buffer to verify structure
    const zip = await JSZip.loadAsync(archiveBuffer);

    const specFile = zip.file('tests/specs/login-authentication-flow.spec.ts');
    expect(specFile).not.toBeNull();
    const specContent = await specFile?.async('string');
    expect(specContent).toContain('import { test, expect }');

    const poFile = zip.file('tests/page-objects/LoginPage.page.ts');
    expect(poFile).not.toBeNull();
    const poContent = await poFile?.async('string');
    expect(poContent).toContain('class LoginPage');

    const readmeFile = zip.file('README.qa-automater.md');
    expect(readmeFile).not.toBeNull();
    const readmeContent = await readmeFile?.async('string');
    expect(readmeContent).toContain('# 🧪 QA Automater - Generated Playwright Test Package');

    const envFile = zip.file('.env.example');
    expect(envFile).not.toBeNull();
    const envContent = await envFile?.async('string');
    expect(envContent).toContain('BASE_URL=');
  });

  it('AC2: redacts embedded secrets in ZIP archive contents', async () => {
    const archiveBuffer = await createTestZipArchive({
      specFiles: [
        {
          filename: 'secret.spec.ts',
          content: 'const token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz1234";',
        },
      ],
      pageObjectFiles: [],
    });

    const zip = await JSZip.loadAsync(archiveBuffer);
    const specContent = await zip.file('tests/specs/secret.spec.ts')?.async('string');
    expect(specContent).toContain('[REDACTED_GITHUB_TOKEN]');
    expect(specContent).not.toContain('ghp_1234567890abcdefghijklmnopqrstuvwxyz1234');
  });

  it('generates readable default README walkthrough', () => {
    const readme = generateDefaultReadmeWalkthrough({
      specFiles: [{ filename: 'login.spec.ts', content: '' }],
      pageObjectFiles: [{ filename: 'LoginPage.page.ts', content: '' }],
    });

    expect(readme).toContain('login.spec.ts');
    expect(readme).toContain('LoginPage.page.ts');
    expect(readme).toContain('npx playwright test');
  });
});
