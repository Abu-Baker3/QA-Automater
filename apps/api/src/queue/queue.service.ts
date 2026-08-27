import { Injectable, OnModuleDestroy, NotFoundException } from '@nestjs/common';
import { QueueService as SharedQueueService, QueueName, pingRedis } from '@qa-automater/shared';
import { randomUUID } from 'crypto';

export interface EnqueueScanJobDto {
  repository_id: string;
  full_name: string;
  branch: string;
  org_id?: string;
  scan_id?: string;
  provider?: string;
}

export interface ScanJobRecord {
  job_id: string;
  repository_id: string;
  full_name: string;
  branch: string;
  org_id: string;
  status: 'queued' | 'active' | 'completed' | 'failed';
  attempts_max: number;
  attempts_made: number;
  created_at: Date;
}

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly scanJobsStore = new Map<string, ScanJobRecord>();
  public sharedQueueService: SharedQueueService;

  constructor() {
    this.sharedQueueService = new SharedQueueService();
  }

  async enqueueJob<T = Record<string, unknown>>(
    queueName: QueueName | string,
    jobName: string,
    data: T,
  ) {
    return this.sharedQueueService.enqueueJob(queueName, jobName, data);
  }

  /**
   * Enqueue scan job with BullMQ retry policy (3 attempts, exponential backoff).
   * AC1: Returns status 'queued' immediately within 30 seconds.
   * AC2: Configured with 3 max attempts and exponential backoff retry.
   */
  async enqueueScanJob(dto: EnqueueScanJobDto): Promise<{
    job_id: string;
    scan_id: string;
    repository_id: string;
    status: 'queued';
    attempts_max: number;
    created_at: Date;
  }> {
    const jobId = `job_scan_${randomUUID()}`;
    const scanId = dto.scan_id || `scan_${randomUUID()}`;
    const orgId = dto.org_id || 'default_org';

    const payload = {
      job_id: jobId,
      scan_id: scanId,
      repository_id: dto.repository_id,
      full_name: dto.full_name,
      branch: dto.branch,
      org_id: orgId,
      provider: dto.provider || 'github',
    };

    // Enqueue with BullMQ durable retry policy (3 retries, exponential backoff)
    await this.sharedQueueService.enqueueJob(QueueName.SCAN, 'process-repository-scan', payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });

    const record: ScanJobRecord = {
      job_id: jobId,
      repository_id: dto.repository_id,
      full_name: dto.full_name,
      branch: dto.branch,
      org_id: orgId,
      status: 'queued',
      attempts_max: 3,
      attempts_made: 0,
      created_at: new Date(),
    };
    this.scanJobsStore.set(jobId, record);

    return {
      job_id: jobId,
      scan_id: scanId,
      repository_id: dto.repository_id,
      status: 'queued',
      attempts_max: 3,
      created_at: record.created_at,
    };
  }

  /**
   * Inspect scan job status and attempt count.
   */
  async getScanJobStatus(jobId: string): Promise<ScanJobRecord> {
    const record = this.scanJobsStore.get(jobId);
    if (!record) {
      throw new NotFoundException(`Scan job with ID '${jobId}' was not found.`);
    }
    return record;
  }

  async checkHealth(): Promise<{ ok: boolean; redis: string }> {
    const isAlive = await pingRedis();
    return {
      ok: isAlive,
      redis: isAlive ? 'connected' : 'disconnected',
    };
  }

  async onModuleDestroy() {
    await this.sharedQueueService.closeAll();
  }
}
