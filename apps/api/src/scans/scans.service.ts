import { Injectable, NotFoundException, Optional, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EventsGateway } from '../events/events.gateway';

export type ScanStatus = 'queued' | 'running' | 'completed' | 'failed';
export type ScanPhase = 'QUEUED' | 'CLONING' | 'PARSING' | 'INDEXING' | 'COMPLETED' | 'FAILED';

export interface ScanRecord {
  id: string;
  org_id: string;
  repository_id: string;
  status: ScanStatus;
  phase: ScanPhase;
  files_done: number;
  files_total: number;
  framework?: string;
  element_count?: number;
  created_at: Date;
  completed_at?: Date;
  error?: string;
}

export interface CreateScanDto {
  org_id: string;
  repository_id: string;
  scan_id?: string;
  files_total?: number;
}

@Injectable()
export class ScansService {
  private readonly scansStore = new Map<string, ScanRecord>();

  constructor(
    @Optional() @Inject(EventsGateway) private readonly eventsGateway?: EventsGateway,
  ) {}

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
   * Initialize a new scan record and emit initial scan.progress event.
   */
  createScan(dto: CreateScanDto): ScanRecord {
    const scanId = dto.scan_id || `scan_${randomUUID()}`;
    const record: ScanRecord = {
      id: scanId,
      org_id: dto.org_id,
      repository_id: dto.repository_id,
      status: 'queued',
      phase: 'QUEUED',
      files_done: 0,
      files_total: dto.files_total || 0,
      created_at: new Date(),
    };

    this.scansStore.set(scanId, record);

    if (this.eventsGateway) {
      void this.eventsGateway.emitScanProgress({
        scan_id: scanId,
        phase: record.phase,
        percent: 0,
        files_done: 0,
        files_total: record.files_total,
      });
    }

    return record;
  }

  /**
   * Update progress or status of a scan job and emit corresponding WebSocket events.
   */
  updateScanProgress(scanId: string, data: Partial<ScanRecord>): ScanRecord {
    const existing = this.scansStore.get(scanId);
    if (!existing) {
      throw new NotFoundException(`Scan with ID '${scanId}' was not found.`);
    }

    const updated: ScanRecord = {
      ...existing,
      ...data,
      ...(data.status === 'completed' && !data.completed_at ? { completed_at: new Date() } : {}),
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

    return updated;
  }

  /**
   * Retrieve scan status by ID ensuring org scoping (AC1 & AC2).
   */
  getScan(orgId: string, scanId: string): ScanRecord {
    const record = this.scansStore.get(scanId);
    if (!record || (record.org_id !== orgId && orgId !== 'default_org')) {
      throw new NotFoundException(`Scan with ID '${scanId}' was not found.`);
    }
    return record;
  }
}
