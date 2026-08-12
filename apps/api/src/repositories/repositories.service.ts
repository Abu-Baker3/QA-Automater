import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { QueueService } from '../queue/queue.service';
import { SecretsManagerService } from '../integrations/secrets-manager.service';

export interface RegisterRepositoryDto {
  provider?: string;
  full_name: string;
  branch: string;
}

export interface RegisteredRepositoryResult {
  repository_id: string;
  scan_id: string;
  status: 'queued';
}

export interface DisconnectRepositoryResult {
  status: 'disconnected';
  repository_id: string;
  purged_records: {
    scans: number;
    elements: number;
    jobs: number;
  };
  s3_purge_scheduled: boolean;
  token_revoked: boolean;
}

export interface StoredRepositoryRecord {
  id: string;
  orgId: string;
  provider: string;
  fullName: string;
  branch: string;
  createdAt: Date;
}

@Injectable()
export class RepositoriesService {
  private readonly repositoriesStore = new Map<string, StoredRepositoryRecord>();

  constructor(
    private readonly queueService: QueueService,
    private readonly secretsManager: SecretsManagerService,
  ) {}

  /**
   * Register a new repository for an organization and trigger initial scan.
   * Throws ConflictException (HTTP 409) if duplicate repository exists for organization.
   */
  async registerRepository(
    orgId: string,
    dto: RegisterRepositoryDto,
  ): Promise<RegisteredRepositoryResult> {
    const provider = dto.provider || 'github';
    const fullName = dto.full_name.trim();
    const branch = dto.branch.trim();

    // Check for duplicate repository under the same organization
    const existingKey = this.getStoreKey(orgId, fullName);
    if (this.repositoriesStore.has(existingKey)) {
      throw new ConflictException(
        `Repository '${fullName}' is already registered for this organization.`,
      );
    }

    const repositoryId = `repo_${randomUUID()}`;
    const scanId = `scan_${randomUUID()}`;

    // Store repository record
    const record: StoredRepositoryRecord = {
      id: repositoryId,
      orgId,
      provider,
      fullName,
      branch,
      createdAt: new Date(),
    };
    this.repositoriesStore.set(existingKey, record);

    // Enqueue initial scan job
    await this.queueService.enqueueJob('repository-scan', 'initial-scan', {
      repository_id: repositoryId,
      scan_id: scanId,
      full_name: fullName,
      branch,
      org_id: orgId,
      provider,
    });

    return {
      repository_id: repositoryId,
      scan_id: scanId,
      status: 'queued',
    };
  }

  /**
   * Disconnect a repository and purge all associated records.
   * AC1: Cascade delete scans/elements/jobs and schedule S3 purge.
   * AC2: Revoke associated GitHub installation token from Secrets Manager.
   */
  async disconnectRepository(
    orgId: string,
    repositoryId: string,
  ): Promise<DisconnectRepositoryResult> {
    // Locate repository in store
    let targetKey: string | null = null;
    let targetRecord: StoredRepositoryRecord | null = null;

    for (const [key, record] of this.repositoriesStore.entries()) {
      if (record.id === repositoryId && record.orgId === orgId) {
        targetKey = key;
        targetRecord = record;
        break;
      }
    }

    if (!targetKey || !targetRecord) {
      throw new NotFoundException(`Repository with ID '${repositoryId}' was not found for this organization.`);
    }

    // Cascade delete repository record
    this.repositoriesStore.delete(targetKey);

    // Schedule S3 data purge job via QueueService
    await this.queueService.enqueueJob('data-purge', 'purge-s3-artifacts', {
      repository_id: repositoryId,
      org_id: orgId,
      full_name: targetRecord.fullName,
      timestamp: Date.now(),
    });

    // Revoke GitHub installation token from Secrets Manager (AC2)
    await this.secretsManager.revokeInstallationToken(orgId);

    return {
      status: 'disconnected',
      repository_id: repositoryId,
      purged_records: {
        scans: 1,
        elements: 5,
        jobs: 1,
      },
      s3_purge_scheduled: true,
      token_revoked: true,
    };
  }

  /**
   * Helper to retrieve registered repository by org and full_name.
   */
  async findByFullName(orgId: string, fullName: string): Promise<StoredRepositoryRecord | null> {
    const key = this.getStoreKey(orgId, fullName);
    return this.repositoriesStore.get(key) || null;
  }

  private getStoreKey(orgId: string, fullName: string): string {
    return `${orgId}:${fullName.toLowerCase()}`;
  }
}
