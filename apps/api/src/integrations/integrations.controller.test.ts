import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationsController } from './integrations.controller';
import { GitHubIntegrationService } from './github-integration.service';
import { SecretsManagerService } from './secrets-manager.service';
import { UnauthorizedException } from '@nestjs/common';

describe('IntegrationsController', () => {
  let controller: IntegrationsController;
  let githubService: GitHubIntegrationService;
  let secretsManager: SecretsManagerService;

  beforeEach(() => {
    secretsManager = new SecretsManagerService();
    githubService = new GitHubIntegrationService(secretsManager);
    controller = new IntegrationsController(githubService);
  });

  it('should return authorization URL when connectGitHub is called', async () => {
    const res = await controller.connectGitHub('org_test');
    expect(res.authorization_url).toContain('https://github.com/apps/');
  });

  it('should store token in SecretsManager when callback is processed', async () => {
    const res = await controller.handleCallback(
      { code: 'code_xyz', installationId: 'inst_777' },
      'org_test',
    );

    expect(res.status).toBe('connected');
    expect(res.installationId).toBe('inst_777');

    const storedSecret = await secretsManager.getInstallationToken('org_test');
    expect(storedSecret).not.toBeNull();
    expect(storedSecret?.installationId).toBe('inst_777');
  });

  it('should throw clear re-auth prompt on validateScanToken when token is expired', async () => {
    await secretsManager.storeInstallationToken(
      'org_test',
      'inst_777',
      'gho_expired',
      new Date(Date.now() - 10000), // Expired
    );

    await expect(
      controller.validateScanToken({}, 'org_test'),
    ).rejects.toThrow(
      'GitHub installation token has expired. Please re-authenticate your GitHub connection.',
    );
  });
});
