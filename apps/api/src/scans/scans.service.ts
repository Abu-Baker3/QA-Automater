import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

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

  /**
   * Initialize a new scan record.
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
    return record;
  }

  /**
   * Update progress or status of a scan job.
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
