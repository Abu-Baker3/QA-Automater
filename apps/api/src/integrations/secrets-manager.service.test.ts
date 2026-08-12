import { describe, it, expect, beforeEach } from 'vitest';
import { SecretsManagerService } from './secrets-manager.service';

describe('SecretsManagerService', () => {
  let service: SecretsManagerService;

  beforeEach(() => {
    service = new SecretsManagerService();
  });

  it('should store and retrieve an active installation token', async () => {
    const orgId = 'org_123';
    const installationId = 'gh_inst_999';
    const token = 'gho_secret_token_abc123';
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour in future

    await service.storeInstallationToken(orgId, installationId, token, expiresAt);

    const result = await service.getInstallationToken(orgId);
    expect(result).not.toBeNull();
    expect(result?.token).toBe(token);
    expect(result?.installationId).toBe(installationId);
    expect(result?.isExpired).toBe(false);
  });

  it('should return isExpired true when token expiration has passed', async () => {
    const orgId = 'org_456';
    const installationId = 'gh_inst_888';
    const token = 'gho_expired_token';
    const expiresAt = new Date(Date.now() - 1000); // 1 sec in past

    await service.storeInstallationToken(orgId, installationId, token, expiresAt);

    const result = await service.getInstallationToken(orgId);
    expect(result).not.toBeNull();
    expect(result?.isExpired).toBe(true);
  });

  it('should return null if no token is stored for org', async () => {
    const result = await service.getInstallationToken('org_nonexistent');
    expect(result).toBeNull();
  });

  it('should revoke token when requested', async () => {
    const orgId = 'org_789';
    await service.storeInstallationToken(
      orgId,
      'inst_1',
      'tok_1',
      new Date(Date.now() + 10000),
    );

    await service.revokeInstallationToken(orgId);

    const result = await service.getInstallationToken(orgId);
    expect(result).toBeNull();
  });
});
