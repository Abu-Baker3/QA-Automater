import { describe, it, expect, beforeEach } from 'vitest';
import { GitHubIntegrationService } from './github-integration.service';
import { SecretsManagerService } from './secrets-manager.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('GitHubIntegrationService', () => {
  let githubService: GitHubIntegrationService;
  let secretsManager: SecretsManagerService;

  beforeEach(() => {
    secretsManager = new SecretsManagerService();
    githubService = new GitHubIntegrationService(secretsManager);
  });

  it('should generate GitHub authorization URL with org context state', () => {
    const orgId = 'org_123';
    const result = githubService.getConnectUrl(orgId);

    expect(result.authorization_url).toContain('https://github.com/apps/');
    expect(result.authorization_url).toContain('installations/new');
    expect(result.authorization_url).toContain('state=');
  });

  it('should handle callback and store installation token in Secrets Manager', async () => {
    const orgId = 'org_123';
    const callbackResult = await githubService.handleCallback(orgId, 'code_123', 'inst_999');

    expect(callbackResult.status).toBe('connected');
    expect(callbackResult.provider).toBe('github');
    expect(callbackResult.installationId).toBe('inst_999');

    const storedSecret = await secretsManager.getInstallationToken(orgId);
    expect(storedSecret).not.toBeNull();
    expect(storedSecret?.installationId).toBe('inst_999');
    expect(storedSecret?.isExpired).toBe(false);
  });

  it('should throw BadRequestException if callback has neither code nor installationId', async () => {
    await expect(githubService.handleCallback('org_123', '', '')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should validate token successfully when token is active', async () => {
    const orgId = 'org_123';
    await secretsManager.storeInstallationToken(
      orgId,
      'inst_1',
      'gho_active_token',
      new Date(Date.now() + 3600 * 1000),
    );

    const token = await githubService.validateTokenForScan(orgId);
    expect(token).toBe('gho_active_token');
  });

  it('should throw UnauthorizedException with clear re-auth message when token is expired during scan validation', async () => {
    const orgId = 'org_123';
    await secretsManager.storeInstallationToken(
      orgId,
      'inst_1',
      'gho_expired_token',
      new Date(Date.now() - 5000),
    );

    await expect(githubService.validateTokenForScan(orgId)).rejects.toThrow(
      'GitHub installation token has expired. Please re-authenticate your GitHub connection.',
    );
  });

  it('should throw UnauthorizedException when no token is found for org during scan validation', async () => {
    await expect(githubService.validateTokenForScan('org_unconnected')).rejects.toThrow(
      'No GitHub integration found for this organization. Please connect your GitHub account.',
    );
  });

  it('AC1: should return paginated list of accessible repositories when valid token exists', async () => {
    const orgId = 'org_123';
    await secretsManager.storeInstallationToken(
      orgId,
      'inst_1',
      'gho_valid_token',
      new Date(Date.now() + 3600 * 1000),
    );

    const res = await githubService.listAccessibleRepositories(orgId, 1, 2);

    expect(res.repositories).toHaveLength(2);
    expect(res.total).toBe(3);
    expect(res.repositories[0]).toEqual(
      expect.objectContaining({
        full_name: 'acme/web-app',
        default_branch: 'main',
        name: 'web-app',
        private: true,
      }),
    );
  });

  it('AC1: should filter accessible repositories by search query', async () => {
    const orgId = 'org_123';
    await secretsManager.storeInstallationToken(
      orgId,
      'inst_1',
      'gho_valid_token',
      new Date(Date.now() + 3600 * 1000),
    );

    const res = await githubService.listAccessibleRepositories(orgId, 1, 10, 'docs');

    expect(res.repositories).toHaveLength(1);
    expect(res.repositories[0]?.full_name).toBe('acme/docs');
  });

  it('E12.3 AC1 & AC2: should create GitHub Pull Request with files strictly under target_path', async () => {
    const orgId = 'org_123';
    await secretsManager.storeInstallationToken(
      orgId,
      'inst_1',
      'gho_valid_token',
      new Date(Date.now() + 3600 * 1000),
    );

    const prResult = await githubService.createPullRequest({
      orgId,
      repositoryId: 'acme/web-app',
      jobId: 'job_uuid_777',
      targetBranch: 'main',
      targetPath: 'tests/e2e',
      specFiles: [{ filename: 'login.spec.ts', content: 'test code' }],
      pageObjectFiles: [{ filename: 'LoginPage.page.ts', content: 'po code' }],
    });

    expect(prResult.pull_request_url).toContain('https://github.com/acme/web-app/pull/');
    expect(prResult.pull_request_number).toBeGreaterThan(0);
    expect(prResult.branch_name).toBe('qa-automater/tests-job_uuid_777');
    expect(prResult.target_branch).toBe('main');
    expect(prResult.target_path).toBe('tests/e2e');
    expect(prResult.files_created).toContain('tests/e2e/specs/login.spec.ts');
    expect(prResult.files_created).toContain('tests/e2e/page-objects/LoginPage.page.ts');
    expect(prResult.files_created).toContain('tests/e2e/README.qa-automater.md');
    expect(prResult.files_created).toContain('tests/e2e/.env.example');
  });
});
