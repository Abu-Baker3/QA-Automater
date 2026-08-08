import { Injectable } from '@nestjs/common';
import { S3StorageService, buildArtifactStorageKey } from '@qa-automater/shared';

@Injectable()
export class StorageService {
  private s3Service = new S3StorageService();

  buildKey(orgId: string, repoId: string, path: string): string {
    return buildArtifactStorageKey(orgId, repoId, path);
  }

  async uploadArtifact(
    orgId: string,
    repoId: string,
    filename: string,
    body: Buffer | string,
    contentType?: string,
  ) {
    return this.s3Service.uploadArtifact(orgId, repoId, filename, body, contentType);
  }

  async getArtifact(key: string): Promise<Buffer> {
    return this.s3Service.getArtifact(key);
  }

  async getPresignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string> {
    return this.s3Service.getPresignedDownloadUrl(key, expiresInSeconds);
  }

  async checkHealth(): Promise<{ ok: boolean; bucket: string }> {
    return this.s3Service.checkHealth();
  }
}
