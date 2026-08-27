import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StorageConfig {
  bucketName: string;
  region?: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export function buildArtifactStorageKey(
  orgId: string,
  repoId: string,
  relativePath: string,
): string {
  if (!orgId || !orgId.trim()) {
    throw new Error('orgId is required to construct artifact storage key');
  }
  if (!repoId || !repoId.trim()) {
    throw new Error('repoId is required to construct artifact storage key');
  }
  if (!relativePath || !relativePath.trim()) {
    throw new Error('relativePath is required to construct artifact storage key');
  }

  const cleanOrg = orgId
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter((segment) => segment && !/^\.+$/.test(segment))
    .join('-');

  const cleanRepo = repoId
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter((segment) => segment && !/^\.+$/.test(segment))
    .join('-');

  if (!cleanOrg) {
    throw new Error('Invalid orgId provided for storage key');
  }
  if (!cleanRepo) {
    throw new Error('Invalid repoId provided for storage key');
  }

  // Sanitize path to prevent directory traversal outside of org_id/repo_id prefix
  const cleanPath = relativePath
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .filter((segment) => segment && !/^\.+$/.test(segment))
    .join('/');

  if (!cleanPath) {
    throw new Error('Invalid relativePath provided for storage key');
  }

  return `${cleanOrg}/${cleanRepo}/${cleanPath}`;
}

export function parseArtifactStorageKey(key: string): {
  orgId: string;
  repoId: string;
  relativePath: string;
} {
  const parts = key.split('/');
  const relativePath = parts.slice(2).join('/');
  if (parts.length < 3 || !parts[0] || !parts[1] || !relativePath) {
    throw new Error(`Invalid storage key format: "${key}". Expected {org_id}/{repo_id}/{path}`);
  }

  const orgId = parts[0];
  const repoId = parts[1];

  return { orgId, repoId, relativePath };
}

import crypto from 'crypto';
import { ArtifactStorageResult } from '@qa-automater/types';

export function buildJobArtifactStorageKey(
  orgId: string,
  jobId: string,
  relativePath: string,
): string {
  if (!orgId || !orgId.trim()) {
    throw new Error('orgId is required to construct artifact storage key');
  }
  if (!jobId || !jobId.trim()) {
    throw new Error('jobId is required to construct artifact storage key');
  }
  if (!relativePath || !relativePath.trim()) {
    throw new Error('relativePath is required to construct artifact storage key');
  }

  const cleanOrg = orgId
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter((segment) => segment && !/^\.+$/.test(segment))
    .join('-');

  const cleanJob = jobId
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter((segment) => segment && !/^\.+$/.test(segment))
    .join('-');

  const cleanPath = relativePath
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .filter((segment) => segment && !/^\.+$/.test(segment))
    .join('/');

  return `${cleanOrg}/artifacts/${cleanJob}/${cleanPath}`;
}

export function computeSha256Checksum(body: Buffer | string): string {
  const buffer = typeof body === 'string' ? Buffer.from(body) : body;
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * AC2: Sanitizes credentials/secrets from artifact content, ensuring no API keys or secrets are embedded.
 */
export function sanitizeArtifactCredentials(content: string): string {
  return content
    .replace(/(ghp_[a-zA-Z0-9]{36})/g, '[REDACTED_GITHUB_TOKEN]')
    .replace(/(sk-[a-zA-Z0-9]{32,})/g, '[REDACTED_OPENAI_KEY]')
    .replace(/(AKIA[0-9A-Z]{16})/g, '[REDACTED_AWS_ACCESS_KEY]')
    .replace(/(bearer\s+)[a-zA-Z0-9._~+/-]+=*/gi, '$1[REDACTED_BEARER_TOKEN]');
}

/**
 * AC2: Generates a clean .env.example file containing only safe placeholders.
 */
export function generateEnvExamplePlaceholder(): string {
  return [
    '# QA Automater — Test Suite Environment Variables',
    'BASE_URL=http://localhost:3000',
    'TEST_USER_EMAIL=placeholder_user@example.com',
    'TEST_USER_PASSWORD=placeholder_password',
    'PLAYWRIGHT_HEADLESS=true',
    '',
  ].join('\n');
}

export class S3StorageService {
  private client: S3Client;
  private bucketName: string;

  constructor(config?: Partial<StorageConfig>) {
    this.bucketName =
      config?.bucketName || process.env.S3_BUCKET_NAME || 'qa-automater-artifacts-local';

    const region = config?.region || process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1';
    const endpoint = config?.endpoint || process.env.S3_ENDPOINT;
    const forcePathStyle =
      config?.forcePathStyle ?? (process.env.S3_FORCE_PATH_STYLE === 'true' || Boolean(endpoint));

    this.client = new S3Client({
      region,
      ...(endpoint ? { endpoint } : {}),
      forcePathStyle,
      ...(config?.credentials ? { credentials: config.credentials } : {}),
    });
  }

  getBucketName(): string {
    return this.bucketName;
  }

  async checkHealth(): Promise<{ ok: boolean; bucket: string }> {
    try {
      const command = new HeadBucketCommand({ Bucket: this.bucketName });
      await this.client.send(command);
      return { ok: true, bucket: this.bucketName };
    } catch {
      return { ok: false, bucket: this.bucketName };
    }
  }

  async uploadArtifact(
    orgId: string,
    repoId: string,
    filename: string,
    body: Buffer | string,
    contentType = 'application/octet-stream',
  ): Promise<{ key: string; bucket: string; size: number }> {
    const key = buildArtifactStorageKey(orgId, repoId, filename);
    const buffer = typeof body === 'string' ? Buffer.from(body) : body;

    const params: PutObjectCommandInput = {
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: {
        'org-id': orgId,
        'repo-id': repoId,
      },
    };

    await this.client.send(new PutObjectCommand(params));

    return {
      key,
      bucket: this.bucketName,
      size: buffer.length,
    };
  }

  /**
   * AC1: Uploads a job artifact to s3://{org_id}/artifacts/{job_id}/{filename} with SHA-256 checksum (AC1) and credential sanitization (AC2).
   */
  async uploadJobArtifact(
    orgId: string,
    jobId: string,
    filename: string,
    body: Buffer | string,
    contentType = 'text/plain',
  ): Promise<ArtifactStorageResult> {
    const rawContent = typeof body === 'string' ? body : body.toString('utf-8');
    const sanitizedContent = sanitizeArtifactCredentials(rawContent);
    const buffer = Buffer.from(sanitizedContent);
    const checksumSha256 = computeSha256Checksum(buffer);
    const key = buildJobArtifactStorageKey(orgId, jobId, filename);

    const params: PutObjectCommandInput = {
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: {
        'org-id': orgId,
        'job-id': jobId,
        'checksum-sha256': checksumSha256,
      },
    };

    await this.client.send(new PutObjectCommand(params));

    return {
      key,
      bucket: this.bucketName,
      size: buffer.length,
      checksumSha256,
    };
  }

  async getArtifact(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error(`Empty response body for key: ${key}`);
    }

    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  }

  async getPresignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async deleteArtifact(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.client.send(command);
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }
}
