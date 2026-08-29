import { describe, expect, it } from 'vitest';
import {
  buildArtifactStorageKey,
  buildJobArtifactStorageKey,
  computeSha256Checksum,
  generateEnvExamplePlaceholder,
  parseArtifactStorageKey,
  sanitizeArtifactCredentials,
  S3StorageService,
} from './index';

describe('S3 Storage Key Prefix Rules (AC-2)', () => {
  it('correctly formats storage keys with org_id/repo_id/ prefix', () => {
    const key = buildArtifactStorageKey('org-123', 'repo-456', 'test-run/results.json');
    expect(key).toBe('org-123/repo-456/test-run/results.json');
  });

  it('sanitizes leading slashes and path traversal attempts', () => {
    const key = buildArtifactStorageKey('/org-123/', '/repo-456/', '../nested/./path/artifact.zip');
    expect(key).toBe('org-123/repo-456/nested/path/artifact.zip');
  });

  it('prevents nested path traversal bypass attempts like ....//file.txt', () => {
    const key = buildArtifactStorageKey(
      'org-123/sub',
      'repo-456\\other',
      '....//nested/../path/artifact.zip',
    );
    expect(key).toBe('org-123-sub/repo-456-other/nested/path/artifact.zip');
  });

  it('throws error when orgId is missing or empty', () => {
    expect(() => buildArtifactStorageKey('', 'repo-1', 'file.txt')).toThrow(
      'orgId is required to construct artifact storage key',
    );
  });

  it('throws error when repoId is missing or empty', () => {
    expect(() => buildArtifactStorageKey('org-1', '', 'file.txt')).toThrow(
      'repoId is required to construct artifact storage key',
    );
  });

  it('throws error when relativePath is missing or empty', () => {
    expect(() => buildArtifactStorageKey('org-1', 'repo-1', '')).toThrow(
      'relativePath is required to construct artifact storage key',
    );
  });

  it('parses valid artifact storage keys back into components', () => {
    const parsed = parseArtifactStorageKey('org-123/repo-456/suite/report.xml');
    expect(parsed).toEqual({
      orgId: 'org-123',
      repoId: 'repo-456',
      relativePath: 'suite/report.xml',
    });
  });

  it('throws error when parsing an invalid storage key format or trailing empty path', () => {
    expect(() => parseArtifactStorageKey('invalid-key-without-prefix')).toThrow(
      'Invalid storage key format',
    );
    expect(() => parseArtifactStorageKey('org-123/repo-456/')).toThrow(
      'Invalid storage key format',
    );
  });
});

describe('S3StorageService Client Initializer', () => {
  it('instantiates with custom or default bucket options', () => {
    const service = new S3StorageService({
      bucketName: 'custom-test-bucket',
      region: 'us-west-2',
    });
    expect(service.getBucketName()).toBe('custom-test-bucket');
  });

  it('provides checkHealth method returning bucket status', async () => {
    const service = new S3StorageService({
      bucketName: 'custom-test-bucket',
    });
    const health = await service.checkHealth();
    expect(health.bucket).toBe('custom-test-bucket');
    expect(typeof health.ok).toBe('boolean');
  });
});

describe('Store Generated Artifacts in S3 (E12.1 AC1 & AC2)', () => {
  it('AC1: builds job artifact key in s3://{org_id}/artifacts/{job_id}/{path} format', () => {
    const key = buildJobArtifactStorageKey('org-acme', 'job-999', 'tests/login.spec.ts');
    expect(key).toBe('org-acme/artifacts/job-999/tests/login.spec.ts');
  });

  it('AC1: computes valid SHA-256 checksum for artifact payload', () => {
    const checksum = computeSha256Checksum('console.log("hello world");');
    expect(checksum).toHaveLength(64);
    expect(checksum).toBe('c315b2d7ef4b9a2b8e783c2d43264d996a53d23a8252292a6aa56525db5d87fd');
  });

  it('AC2: redacts GitHub tokens, OpenAI keys, AWS keys, and Bearer tokens from content', () => {
    const rawContent = `
const GITHUB_TOKEN = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz';
const OPENAI_KEY = 'sk-1234567890abcdef1234567890abcdef';
const AWS_KEY = 'AKIA1234567890ABCDEF';
const AUTH_HEADER = 'Bearer secret-jwt-token-value';
`;
    const sanitized = sanitizeArtifactCredentials(rawContent);

    expect(sanitized).not.toContain('ghp_1234567890abcdefghijklmnopqrstuvwxyz');
    expect(sanitized).not.toContain('sk-1234567890abcdef1234567890abcdef');
    expect(sanitized).not.toContain('AKIA1234567890ABCDEF');
    expect(sanitized).toContain('[REDACTED_GITHUB_TOKEN]');
    expect(sanitized).toContain('[REDACTED_OPENAI_KEY]');
    expect(sanitized).toContain('[REDACTED_AWS_ACCESS_KEY]');
    expect(sanitized).toContain('Bearer [REDACTED_BEARER_TOKEN]');
  });

  it('AC2: generates .env.example with safe placeholders only', () => {
    const envExample = generateEnvExamplePlaceholder();

    expect(envExample).toContain('BASE_URL=http://localhost:3000');
    expect(envExample).toContain('TEST_USER_EMAIL=placeholder_user@example.com');
    expect(envExample).not.toContain('ghp_');
    expect(envExample).not.toContain('sk-');
  });

  describe('Encrypt Repo Snapshots and Artifacts at Rest via SSE-KMS (E14.2 AC1)', () => {
    it('AC1: enables SSE-KMS by default with default KMS key ID', () => {
      const service = new S3StorageService();
      expect(service.getServerSideEncryption()).toBe('aws:kms');
      expect(service.getKmsKeyId()).toBe('alias/qa-automater-artifacts-key');
    });

    it('AC1: accepts custom KMS key and encryption configuration', () => {
      const service = new S3StorageService({
        serverSideEncryption: 'aws:kms',
        kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
      });
      expect(service.getServerSideEncryption()).toBe('aws:kms');
      expect(service.getKmsKeyId()).toBe('arn:aws:kms:us-east-1:123456789012:key/test-key-id');
    });
  });
});
