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
    await service.storeInstallationToken(orgId, 'inst_1', 'tok_1', new Date(Date.now() + 10000));

    await service.revokeInstallationToken(orgId);

    const result = await service.getInstallationToken(orgId);
    expect(result).toBeNull();
  });

  describe('Encrypt Secrets at Rest and Zero Token Logging (Story E14.2 AC2)', () => {
    it('AC2: encrypts token at rest so internal storage does not contain plaintext token', async () => {
      const orgId = 'org_encrypt_test';
      const token = 'gho_plaintext_super_secret_github_token_xyz';

      await service.storeInstallationToken(
        orgId,
        'inst_enc',
        token,
        new Date(Date.now() + 3600000),
      );

      const retrieved = await service.getInstallationToken(orgId);
      expect(retrieved?.token).toBe(token);

      // Verify that internal secretStore has encryptedData and does not match plaintext
      const internalEntry = (
        service as unknown as { secretsStore: Map<string, { encryptedData: string }> }
      ).secretsStore.get(`secrets/github_token_${orgId}`);

      expect(internalEntry).toBeDefined();
      expect(internalEntry?.encryptedData).not.toBe(token);
      expect(internalEntry?.encryptedData).not.toContain('gho_plaintext_super_secret');
    });

    it('AC2: masks GitHub tokens for log outputs', () => {
      const token = 'gho_1234567890abcdefghijklmnopqrstuvwxyz';
      const masked = SecretsManagerService.maskToken(token);
      expect(masked).toBe('gho_...wxyz');
      expect(masked).not.toContain('1234567890abcdefghijklmnopqrstu');
    });

    it('AC2: sanitizes log messages containing GitHub PAT or OAuth tokens', () => {
      const rawLog =
        'Connecting with token gho_1234567890abcdefghijklmnopqrstuvwxyz and pat github_pat_1234567890abcdefghij';
      const sanitized = SecretsManagerService.sanitizeSecretLogs(rawLog);

      expect(sanitized).not.toContain('gho_1234567890abcdefghijklmnopqrstuvwxyz');
      expect(sanitized).not.toContain('github_pat_1234567890abcdefghij');
      expect(sanitized).toContain('[REDACTED_GITHUB_TOKEN]');
    });
  });
});
