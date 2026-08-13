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

  async getArtifact(key: string): Promise<Buffer> {
    parseArtifactStorageKey(key); // Validates key format

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
    parseArtifactStorageKey(key); // Validates key format

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async deleteArtifact(key: string): Promise<void> {
    parseArtifactStorageKey(key); // Validates key format

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
