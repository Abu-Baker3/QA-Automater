import { Injectable, ConflictException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { QueueService } from '../queue/queue.service';

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

  constructor(private readonly queueService: QueueService) {}

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
   * Helper to retrieve registered repository by org and full_name.
   */
  async findByFullName(orgId: string, fullName: string): Promise<StoredRepositoryRecord | null> {
    const key = this.getStoreKey(orgId, fullName);
    return this.repositoriesStore.get(key) || null;
  }

  private getSecretKey(orgId: string, fullName: string): string {
    return `${orgId}:${fullName.toLowerCase()}`;
  }

  private getStoreKey(orgId: string, fullName: string): string {
    return `${orgId}:${fullName.toLowerCase()}`;
  }
}
