import {
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
  Optional,
  Inject,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EventsGateway } from '../events/events.gateway';

export type ScanStatus = 'queued' | 'running' | 'completed' | 'failed';
export type ScanPhase = 'QUEUED' | 'CLONING' | 'PARSING' | 'INDEXING' | 'COMPLETED' | 'FAILED';
export type PlanTier = 'free' | 'pro';

export interface ScanRecord {
  id: string;
  org_id: string;
  repository_id: string;
  commit_sha?: string;
  status: ScanStatus;
  phase: ScanPhase;
  files_done: number;
  files_total: number;
  framework?: string;
  element_count?: number;
  plan_tier?: PlanTier;
  created_at: Date;
  completed_at?: Date;
  error?: string;
}

export interface CreateScanDto {
  org_id: string;
  repository_id: string;
  commit_sha?: string;
  scan_id?: string;
  files_total?: number;
  plan_tier?: PlanTier;
  initial_status?: ScanStatus;
  initial_phase?: ScanPhase;
}

export const MAX_CONCURRENT_SCANS_PER_TENANT = 2;
export const FREE_TIER_DAILY_SCAN_LIMIT = 10;

@Injectable()
export class ScansService {
  private readonly scansStore = new Map<string, ScanRecord>();

  constructor(@Optional() @Inject(EventsGateway) private readonly eventsGateway?: EventsGateway) {}

  /**
   * Get count of currently running scans for an organization.
   */
  getRunningScansCount(orgId: string): number {
    let count = 0;
    for (const record of this.scansStore.values()) {
      if (record.org_id === orgId && record.status === 'running') {
        count++;
      }
    }
    return count;
  }

  /**
   * Get count of scans created today for an organization.
   */
  getDailyScansCount(orgId: string, referenceDate: Date = new Date()): number {
    let count = 0;
    const targetDay = referenceDate.toISOString().slice(0, 10);

    for (const record of this.scansStore.values()) {
      if (record.org_id === orgId) {
        const recordDay = record.created_at.toISOString().slice(0, 10);
        if (recordDay === targetDay) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Check if organization is eligible for a new scan based on plan tier quota (AC2)
   * and concurrent running scan limits (AC1).
   */
  checkScanEligibility(
    orgId: string,
    planTier: PlanTier = 'free',
  ): { canRunNow: boolean; runningCount: number; dailyCount: number } {
    const dailyCount = this.getDailyScansCount(orgId);

    // AC2: Free plan tier daily quota check
    if (planTier === 'free' && dailyCount >= FREE_TIER_DAILY_SCAN_LIMIT) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message:
            'Daily scan quota exceeded for Free plan tier. Please upgrade your plan for additional scans.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const runningCount = this.getRunningScansCount(orgId);
    const canRunNow = runningCount < MAX_CONCURRENT_SCANS_PER_TENANT;

    return {
      canRunNow,
      runningCount,
      dailyCount,
    };
  }

  /**
   * Calculate progress percentage based on scan phase and files processed.
   */
  calculatePercent(record: ScanRecord): number {
    if (record.phase === 'COMPLETED' || record.status === 'completed') return 100;
    if (record.phase === 'FAILED' || record.status === 'failed') return 0;

    if (record.files_total > 0) {
      const ratio = Math.min(1, record.files_done / record.files_total);
      return Math.min(99, Math.round(ratio * 100));
    }

    switch (record.phase) {
      case 'QUEUED':
        return 0;
      case 'CLONING':
        return 20;
      case 'PARSING':
        return 50;
      case 'INDEXING':
        return 80;
      default:
        return 0;
    }
  }

  /**
   * Check if a completed scan already exists for a given repository and commit SHA (E4.6 AC1).
   */
  getCompletedScanByCommit(repositoryId: string, commitSha: string): ScanRecord | undefined {
    for (const record of this.scansStore.values()) {
      if (
        record.repository_id === repositoryId &&
        record.commit_sha === commitSha &&
        record.status === 'completed'
      ) {
        return record;
      }
    }
    return undefined;
  }

  /**
   * Initialize a new scan record after checking idempotency (E4.6), enforcing quota (AC2) and concurrency limits (AC1).
   */
  createScan(dto: CreateScanDto): ScanRecord {
    // E4.6 AC1: If same repo_id + commit_sha is already completed, return existing scan record without re-processing
    if (dto.commit_sha) {
      const existingCompleted = this.getCompletedScanByCommit(dto.repository_id, dto.commit_sha);
      if (existingCompleted) {
        return existingCompleted;
      }
    }

    const planTier = dto.plan_tier || 'free';
    const eligibility = this.checkScanEligibility(dto.org_id, planTier);

    const scanId = dto.scan_id || `scan_${randomUUID()}`;

    // Respect requested initial status/phase if specified, otherwise default to queued
    let initialStatus: ScanStatus = dto.initial_status || 'queued';
    let initialPhase: ScanPhase = dto.initial_phase || 'QUEUED';

    // AC1: If initialStatus was requested as 'running', enforce max 2 concurrent running limit
    if (initialStatus === 'running' && !eligibility.canRunNow) {
      initialStatus = 'queued';
      initialPhase = 'QUEUED';
    }

    const record: ScanRecord = {
      id: scanId,
      org_id: dto.org_id,
      repository_id: dto.repository_id,
      ...(dto.commit_sha ? { commit_sha: dto.commit_sha } : {}),
      status: initialStatus,
      phase: initialPhase,
      files_done: 0,
      files_total: dto.files_total || 0,
      plan_tier: planTier,
      created_at: new Date(),
    };

    this.scansStore.set(scanId, record);

    if (this.eventsGateway) {
      void this.eventsGateway.emitScanProgress({
        scan_id: scanId,
        phase: record.phase,
        percent: this.calculatePercent(record),
        files_done: 0,
        files_total: record.files_total,
      });
    }

    return record;
  }

  /**
   * Update progress or status of a scan job and emit corresponding WebSocket events.
   * Enforces max concurrent running scans per tenant (AC1).
   * Promotes next queued scan if a running scan finishes (AC1).
   */
  updateScanProgress(scanId: string, data: Partial<ScanRecord>): ScanRecord {
    const existing = this.scansStore.get(scanId);
    if (!existing) {
      throw new NotFoundException(`Scan with ID '${scanId}' was not found.`);
    }

    let targetStatus = data.status || existing.status;
    let targetPhase = data.phase || existing.phase;

    // AC1: If scan is attempting to transition to 'running', check running capacity
    if (targetStatus === 'running' && existing.status !== 'running') {
      const runningCount = this.getRunningScansCount(existing.org_id);
      if (runningCount >= MAX_CONCURRENT_SCANS_PER_TENANT) {
        targetStatus = 'queued';
        targetPhase = 'QUEUED';
      }
    }

    const updated: ScanRecord = {
      ...existing,
      ...data,
      status: targetStatus,
      phase: targetPhase,
      ...(targetStatus === 'completed' && !existing.completed_at && !data.completed_at
        ? { completed_at: new Date() }
        : {}),
    };

    this.scansStore.set(scanId, updated);
    const percent = this.calculatePercent(updated);

    if (this.eventsGateway) {
      void this.eventsGateway.emitScanProgress({
        scan_id: scanId,
        phase: updated.phase,
        percent,
        files_done: updated.files_done,
        files_total: updated.files_total,
      });

      if (updated.phase === 'COMPLETED' || updated.status === 'completed') {
        void this.eventsGateway.emitScanComplete({
          scan_id: scanId,
          element_count: updated.element_count ?? 0,
          framework: updated.framework,
        });
      }
    }

    // AC1: When a scan finishes (completed or failed), promote next waiting queued scan for the org
    if (updated.status === 'completed' || updated.status === 'failed') {
      this.promoteNextQueuedScan(updated.org_id);
    }

    return updated;
  }

  /**
   * Auto-promote next queued scan for an org if running count < 2 (AC1).
   */
  private promoteNextQueuedScan(orgId: string): void {
    if (this.getRunningScansCount(orgId) >= MAX_CONCURRENT_SCANS_PER_TENANT) {
      return;
    }

    for (const record of this.scansStore.values()) {
      if (record.org_id === orgId && record.status === 'queued') {
        this.updateScanProgress(record.id, {
          status: 'running',
          phase: 'CLONING',
        });
        break;
      }
    }
  }

  /**
   * Retrieve scan status by ID ensuring org scoping.
   */
  getScan(orgId: string, scanId: string): ScanRecord {
    const record = this.scansStore.get(scanId);
    if (!record || (record.org_id !== orgId && orgId !== 'default_org')) {
      throw new NotFoundException(`Scan with ID '${scanId}' was not found.`);
    }
    return record;
  }
}
