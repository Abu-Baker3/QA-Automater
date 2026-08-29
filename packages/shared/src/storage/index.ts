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
import { createHash } from 'crypto';

export interface StorageConfig {
  bucketName: string;
  region?: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  serverSideEncryption?: 'aws:kms' | 'AES256';
  kmsKeyId?: string;
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

export interface ArtifactStorageResult {
  key: string;
  bucket: string;
  size: number;
  checksumSha256: string;
  serverSideEncryption?: string;
  kmsKeyId?: string;
}

export function buildJobArtifactStorageKey(
  orgId: string,
  jobId: string,
  relativePath: string,
): string {
  if (!orgId || !orgId.trim()) {
    throw new Error('orgId is required to construct job artifact storage key');
  }
  if (!jobId || !jobId.trim()) {
    throw new Error('jobId is required to construct job artifact storage key');
  }
  if (!relativePath || !relativePath.trim()) {
    throw new Error('relativePath is required to construct job artifact storage key');
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

export function computeSha256Checksum(content: Buffer | string): string {
  const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * AC2: Sanitizes credentials/secrets from artifact content, ensuring no API keys or secrets are embedded.
 */
export function sanitizeArtifactCredentials(content: string): string {
  if (!content) return '';

  return content
    .replace(/(ghp_[a-zA-Z0-9]{20,})/g, '[REDACTED_GITHUB_TOKEN]')
    .replace(/(github_pat_[a-zA-Z0-9_]{20,})/g, '[REDACTED_GITHUB_TOKEN]')
    .replace(/(gho_[a-zA-Z0-9]{20,})/g, '[REDACTED_GITHUB_TOKEN]')
    .replace(/(ghs_[a-zA-Z0-9]{20,})/g, '[REDACTED_GITHUB_TOKEN]')
    .replace(/(sk-[a-zA-Z0-9]{20,})/g, '[REDACTED_OPENAI_KEY]')
    .replace(/(AKIA[0-9A-Z]{16})/g, '[REDACTED_AWS_ACCESS_KEY]')
    .replace(
      /((?:api[_-]?key|secret|token|password)\s*[:=]\s*['"]?)[a-zA-Z0-9_\-.~!@#$%^&*+=]{8,}(['"]?)/gi,
      '$1[REDACTED_SECRET]$2',
    )
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
  private serverSideEncryption: 'aws:kms' | 'AES256';
  private kmsKeyId?: string;

  constructor(config?: Partial<StorageConfig>) {
    this.bucketName =
      config?.bucketName || process.env.S3_BUCKET_NAME || 'qa-automater-artifacts-local';

    this.serverSideEncryption =
      config?.serverSideEncryption ||
      (process.env.S3_SERVER_SIDE_ENCRYPTION as 'aws:kms' | 'AES256') ||
      'aws:kms';

    this.kmsKeyId =
      config?.kmsKeyId ||
      process.env.S3_KMS_KEY_ID ||
      process.env.AWS_KMS_KEY_ARN ||
      'alias/qa-automater-artifacts-key';

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

  getServerSideEncryption(): string {
    return this.serverSideEncryption;
  }

  getKmsKeyId(): string | undefined {
    return this.kmsKeyId;
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
  ): Promise<{
    key: string;
    bucket: string;
    size: number;
    serverSideEncryption: string;
    kmsKeyId?: string;
  }> {
    const key = buildArtifactStorageKey(orgId, repoId, filename);
    const buffer = typeof body === 'string' ? Buffer.from(body) : body;

    const params: PutObjectCommandInput = {
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ServerSideEncryption: this.serverSideEncryption,
      ...(this.serverSideEncryption === 'aws:kms' && this.kmsKeyId
        ? { SSEKMSKeyId: this.kmsKeyId }
        : {}),
      Metadata: {
        'org-id': orgId,
        'repo-id': repoId,
        'sse-kms': 'enabled',
      },
    };

    await this.client.send(new PutObjectCommand(params));

    return {
      key,
      bucket: this.bucketName,
      size: buffer.length,
      serverSideEncryption: this.serverSideEncryption,
      kmsKeyId: this.kmsKeyId,
    };
  }

  /**
   * AC1: Uploads a job artifact to s3://{org_id}/artifacts/{job_id}/{filename} with SSE-KMS encryption (E14.2 AC1), SHA-256 checksum (E12.1 AC1) and credential sanitization (E12.1 AC2).
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
      ServerSideEncryption: this.serverSideEncryption,
      ...(this.serverSideEncryption === 'aws:kms' && this.kmsKeyId
        ? { SSEKMSKeyId: this.kmsKeyId }
        : {}),
      Metadata: {
        'org-id': orgId,
        'job-id': jobId,
        'checksum-sha256': checksumSha256,
        'sse-kms': 'enabled',
      },
    };

    await this.client.send(new PutObjectCommand(params));

    return {
      key,
      bucket: this.bucketName,
      size: buffer.length,
      checksumSha256,
      serverSideEncryption: this.serverSideEncryption,
      kmsKeyId: this.kmsKeyId,
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

/**
 * Story E12.2 AC1: Helper to generate a 15-minute presigned download URL for an S3 artifact key.
 */
export async function generatePresignedDownloadUrl(
  key: string,
  expiresInSeconds = 900,
  config?: Partial<StorageConfig>,
): Promise<string> {
  const service = new S3StorageService(config);
  return service.getPresignedDownloadUrl(key, expiresInSeconds);
}

export * from './zip-archiver';
