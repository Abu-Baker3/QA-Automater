import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export interface StoredToken {
  token: string;
  expiresAt: Date;
  installationId: string;
}

export interface EncryptedSecretPayload {
  encryptedData: string;
  iv: string;
  authTag: string;
  expiresAt: string;
  installationId: string;
}

@Injectable()
export class SecretsManagerService {
  private readonly logger = new Logger(SecretsManagerService.name);
  // In-memory secrets store simulating AWS Secrets Manager / Vault storage with encryption at rest
  private readonly secretsStore = new Map<string, EncryptedSecretPayload>();

  // Master encryption key for envelope encryption at rest
  private readonly masterKey: Buffer = Buffer.from(
    (
      process.env.SECRETS_ENCRYPTION_KEY ||
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    ).substring(0, 64),
    'hex',
  );

  /**
   * Masks sensitive GitHub tokens for display or logging (e.g. gho_123456... -> gho_...abcd).
   * Story E14.2 AC2: GitHub tokens are never logged in plaintext.
   */
  static maskToken(token: string): string {
    if (!token) return '';
    if (token.length <= 8) return '[REDACTED]';
    return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
  }

  /**
   * Sanitizes any log message or object to guarantee no plaintext tokens are emitted.
   */
  static sanitizeSecretLogs(message: string): string {
    if (!message) return '';
    return message
      .replace(/(ghp_[a-zA-Z0-9]{20,})/g, '[REDACTED_GITHUB_TOKEN]')
      .replace(/(gho_[a-zA-Z0-9]{20,})/g, '[REDACTED_GITHUB_TOKEN]')
      .replace(/(ghs_[a-zA-Z0-9]{20,})/g, '[REDACTED_GITHUB_TOKEN]')
      .replace(/(github_pat_[a-zA-Z0-9_]{20,})/g, '[REDACTED_GITHUB_TOKEN]');
  }

  /**
   * Securely store GitHub installation token in Secrets Manager.
   * Story E14.2 AC2: Tokens are stored encrypted at rest and never in plaintext database columns or logs.
   */
  async storeInstallationToken(
    orgId: string,
    installationId: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    const secretKey = this.getSecretKey(orgId);
    const encrypted = this.encrypt(token);

    this.secretsStore.set(secretKey, {
      encryptedData: encrypted.encryptedData,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      expiresAt: expiresAt.toISOString(),
      installationId,
    });

    this.logger.log(
      `Securely stored GitHub installation token for org ${orgId} (masked: ${SecretsManagerService.maskToken(token)}) in Secrets Manager`,
    );
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

    const expiresAt = new Date(stored.expiresAt);
    const isExpired = new Date() >= expiresAt;
    const token = this.decrypt(stored.encryptedData, stored.iv, stored.authTag);

    return {
      token,
      expiresAt,
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
    this.logger.log(`Revoked GitHub installation token for org ${orgId} from Secrets Manager`);
  }

  private getSecretKey(orgId: string): string {
    return `secrets/github_token_${orgId}`;
  }

  private encrypt(plaintext: string): { encryptedData: string; iv: string; authTag: string } {
    const iv = randomBytes(12); // GCM standard 96-bit IV
    const cipher = createCipheriv('aes-256-gcm', this.masterKey, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      authTag,
    };
  }

  private decrypt(encryptedData: string, ivHex: string, authTagHex: string): string {
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
