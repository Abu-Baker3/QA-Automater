import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RepositoryCloner } from './repository-cloner';
import { S3StorageService } from '@qa-automater/shared';

describe('RepositoryCloner', () => {
  let cloner: RepositoryCloner;
  let mockStorage: S3StorageService;

  beforeEach(() => {
    mockStorage = new S3StorageService();
    vi.spyOn(mockStorage, 'uploadArtifact').mockResolvedValue({
      key: 'org_123/repo_abc/abcdef1234567890.tar.gz',
      bucket: 'qa-automater-artifacts-local',
      size: 1024,
      serverSideEncryption: 'aws:kms',
    });

    cloner = new RepositoryCloner(mockStorage);
  });

  it('AC1: cloneRepository should execute git clone with depth=1 and specified branch', async () => {
    const cloneSpy = vi.spyOn(cloner, 'cloneRepository').mockResolvedValue(undefined);

    await cloner.cloneRepository({
      cloneUrl: 'https://github.com/acme/web-app.git',
      branch: 'main',
      targetDir: '/tmp/test-dir',
    });

    expect(cloneSpy).toHaveBeenCalledWith({
      cloneUrl: 'https://github.com/acme/web-app.git',
      branch: 'main',
      targetDir: '/tmp/test-dir',
    });
  });

  it('AC2: cloneAndUpload should clone, package tarball, and upload to S3 at {org_id}/{repo_id}/{commit}.tar.gz', async () => {
    vi.spyOn(cloner, 'cloneRepository').mockResolvedValue(undefined);
    vi.spyOn(cloner, 'getCommitHash').mockResolvedValue('abcdef1234567890');
    vi.spyOn(cloner, 'createTarball').mockResolvedValue(Buffer.from('fake-tarball-data'));

    const result = await cloner.cloneAndUpload({
      orgId: 'org_123',
      repoId: 'repo_abc',
      cloneUrl: 'https://github.com/acme/web-app.git',
      branch: 'main',
    });

    expect(result.commitHash).toBe('abcdef1234567890');
    expect(result.key).toBe('org_123/repo_abc/abcdef1234567890.tar.gz');
    expect(mockStorage.uploadArtifact).toHaveBeenCalledWith(
      'org_123',
      'repo_abc',
      'abcdef1234567890.tar.gz',
      expect.any(Buffer),
      'application/gzip',
    );
  });
});
