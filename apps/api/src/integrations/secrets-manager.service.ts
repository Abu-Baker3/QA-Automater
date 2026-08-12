import { Injectable } from '@nestjs/common';

export interface StoredToken {
  token: string;
  expiresAt: Date;
  installationId: string;
}

@Injectable()
export class SecretsManagerService {
  // In-memory secrets store simulating AWS Secrets Manager / Vault storage
  private readonly secretsStore = new Map<string, StoredToken>();

  /**
   * Securely store GitHub installation token in Secrets Manager.
   * Ensures tokens are stored out-of-band and never in plaintext database columns.
   */
  async storeInstallationToken(
    orgId: string,
    installationId: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    const secretKey = this.getSecretKey(orgId);
    this.secretsStore.set(secretKey, {
      token,
      expiresAt,
      installationId,
    });
  }

  /**
   * Retrieve GitHub installation token from Secrets Manager and inspect expiration status.
   */
  async getInstallationToken(orgId: string): Promise<{
    token: string;
    expiresAt: Date;
    installationId: string;
    isExpired: boolean;
  } | null> {
    const secretKey = this.getSecretKey(orgId);
    const stored = this.secretsStore.get(secretKey);

    if (!stored) {
      return null;
    }

    const isExpired = new Date() >= stored.expiresAt;
    return {
      token: stored.token,
      expiresAt: stored.expiresAt,
      installationId: stored.installationId,
      isExpired,
    };
  }

  /**
   * Revoke/delete GitHub installation token from Secrets Manager.
   */
  async revokeInstallationToken(orgId: string): Promise<void> {
    const secretKey = this.getSecretKey(orgId);
    this.secretsStore.delete(secretKey);
  }

  private getSecretKey(orgId: string): string {
    return `secrets/github_token_${orgId}`;
  }
}
