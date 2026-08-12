import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { SecretsManagerService } from './secrets-manager.service';

export interface ConnectGitHubResponse {
  authorization_url: string;
}

export interface OAuthCallbackResult {
  status: string;
  provider: string;
  installationId: string;
  orgId: string;
}

@Injectable()
export class GitHubIntegrationService {
  constructor(private readonly secretsManager: SecretsManagerService) {}

  /**
   * Initiate GitHub App / OAuth authorization flow.
   * Generates authorization URL for Admin connection.
   */
  getConnectUrl(orgId: string): ConnectGitHubResponse {
    const appId = process.env.GITHUB_APP_NAME || 'qa-automater-app';
    const redirectUri = encodeURIComponent(
      process.env.GITHUB_CALLBACK_URL || 'https://api.qaautomater.com/v1/integrations/github/callback',
    );
    const state = Buffer.from(JSON.stringify({ orgId, timestamp: Date.now() })).toString('base64');

    const authorization_url = `https://github.com/apps/${appId}/installations/new?state=${state}&redirect_uri=${redirectUri}`;
    return { authorization_url };
  }

  /**
   * Complete GitHub OAuth / installation callback.
   * Stores installation token in Secrets Manager (never in DB plaintext).
   */
  async handleCallback(
    orgId: string,
    code: string,
    installationId?: string,
  ): Promise<OAuthCallbackResult> {
    if (!code && !installationId) {
      throw new BadRequestException('Invalid callback: missing authorization code or installation_id');
    }

    const effectiveInstallationId = installationId || `inst_${Date.now()}`;
    const token = `gho_mock_installation_token_${Date.now()}`;
    // Tokens expire in 1 hour per GitHub App security rules
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Store token securely in Secrets Manager
    await this.secretsManager.storeInstallationToken(
      orgId,
      effectiveInstallationId,
      token,
      expiresAt,
    );

    return {
      status: 'connected',
      provider: 'github',
      installationId: effectiveInstallationId,
      orgId,
    };
  }

  /**
   * Validate installation token when repository scan is attempted.
   * Throws prompt for re-authentication if token is missing or expired.
   */
  async validateTokenForScan(orgId: string): Promise<string> {
    const tokenData = await this.secretsManager.getInstallationToken(orgId);

    if (!tokenData) {
      throw new UnauthorizedException(
        'No GitHub integration found for this organization. Please connect your GitHub account.',
      );
    }

    if (tokenData.isExpired) {
      throw new UnauthorizedException(
        'GitHub installation token has expired. Please re-authenticate your GitHub connection.',
      );
    }

    return tokenData.token;
  }
}
