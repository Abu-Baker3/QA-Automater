import { describe, it, expect } from 'vitest';
import {
  buildArtifactStorageKey,
  parseArtifactStorageKey,
  S3StorageService,
} from './index';

describe('S3 Storage Key Prefix Rules (AC-2)', () => {
  it('correctly formats storage keys with org_id/repo_id/ prefix', () => {
    const key = buildArtifactStorageKey('org-123', 'repo-456', 'test-run/results.json');
    expect(key).toBe('org-123/repo-456/test-run/results.json');
  });

  it('sanitizes leading slashes and path traversal attempts', () => {
    const key = buildArtifactStorageKey(
      '/org-123/',
      '/repo-456/',
      '../nested/./path/artifact.zip',
    );
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
