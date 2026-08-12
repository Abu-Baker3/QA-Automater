import { describe, it, expect, beforeEach } from 'vitest';
import { GitHubIntegrationService } from './github-integration.service';
import { SecretsManagerService } from './secrets-manager.service';
import { BadRequestException } from '@nestjs/common';

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
    await expect(
      githubService.handleCallback('org_123', '', ''),
    ).rejects.toThrow(BadRequestException);
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

  it('AC2: should throw UnauthorizedException with clear re-auth message when token is expired', async () => {
    const orgId = 'org_123';
    await secretsManager.storeInstallationToken(
      orgId,
      'inst_1',
      'gho_expired_token',
      new Date(Date.now() - 5000), // Expired 5 seconds ago
    );

    await expect(githubService.validateTokenForScan(orgId)).rejects.toThrow(
      'GitHub installation token has expired. Please re-authenticate your GitHub connection.',
    );
  });

  it('should throw UnauthorizedException when no token is found for org', async () => {
    await expect(githubService.validateTokenForScan('org_unconnected')).rejects.toThrow(
      'No GitHub integration found for this organization. Please connect your GitHub account.',
    );
  });
});
