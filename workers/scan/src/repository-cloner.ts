import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { randomUUID } from 'node:crypto';
import { S3StorageService } from '@qa-automater/shared';

const execFileAsync = promisify(execFile);

export interface CloneRepositoryOptions {
  cloneUrl: string;
  branch: string;
  targetDir: string;
  token?: string;
}

export interface CloneAndUploadOptions {
  orgId: string;
  repoId: string;
  cloneUrl: string;
  branch?: string;
  token?: string;
}

export interface CloneAndUploadResult {
  key: string;
  bucket: string;
  commitHash: string;
  size: number;
}

export class RepositoryCloner {
  constructor(private readonly storageService: S3StorageService = new S3StorageService()) {}

  /**
   * Shallow clone repository at depth 1 (AC1)
   */
  async cloneRepository(opts: CloneRepositoryOptions): Promise<void> {
    let authCloneUrl = opts.cloneUrl;
    if (opts.token && opts.cloneUrl.startsWith('https://')) {
      const urlObj = new URL(opts.cloneUrl);
      urlObj.username = 'x-access-token';
      urlObj.password = opts.token;
      authCloneUrl = urlObj.toString();
    }

    const branch = opts.branch || 'main';
    await execFileAsync('git', ['clone', '--depth', '1', '--branch', branch, authCloneUrl, opts.targetDir]);
  }

  /**
   * Resolve current HEAD commit hash
   */
  async getCommitHash(targetDir: string): Promise<string> {
    const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: targetDir });
    return stdout.trim();
  }

  /**
   * Package repository directory into a .tar.gz archive
   */
  async createTarball(sourceDir: string, outputPath: string): Promise<Buffer> {
    await execFileAsync('tar', ['-czf', outputPath, '-C', sourceDir, '.']);
    return fs.readFileSync(outputPath);
  }

  /**
   * Execute shallow clone, resolve commit hash, package tarball, and upload to S3 at {org_id}/{repo_id}/{commit}.tar.gz (AC1 & AC2)
   */
  async cloneAndUpload(opts: CloneAndUploadOptions): Promise<CloneAndUploadResult> {
    const workDir = path.join(os.tmpdir(), `qa-scan-${randomUUID()}`);
    const tarballPath = path.join(os.tmpdir(), `qa-archive-${randomUUID()}.tar.gz`);

    try {
      // 1. Shallow clone depth=1 (AC1)
      await this.cloneRepository({
        cloneUrl: opts.cloneUrl,
        branch: opts.branch || 'main',
        targetDir: workDir,
        token: opts.token,
      });

      // 2. Resolve commit hash
      const commitHash = await this.getCommitHash(workDir);

      // 3. Create .tar.gz tarball archive
      const tarballBuffer = await this.createTarball(workDir, tarballPath);

      // 4. Upload to S3 at {org_id}/{repo_id}/{commit}.tar.gz (AC2)
      const filename = `${commitHash}.tar.gz`;
      const uploadRes = await this.storageService.uploadArtifact(
        opts.orgId,
        opts.repoId,
        filename,
        tarballBuffer,
        'application/gzip',
      );

      return {
        key: uploadRes.key,
        bucket: uploadRes.bucket,
        commitHash,
        size: uploadRes.size,
      };
    } finally {
      // Ephemeral cleanup
      if (fs.existsSync(workDir)) {
        fs.rmSync(workDir, { recursive: true, force: true });
      }
      if (fs.existsSync(tarballPath)) {
        fs.rmSync(tarballPath, { force: true });
      }
    }
  }
}
