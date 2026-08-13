import { describe, it, expect, beforeEach } from 'vitest';
import { ScansService } from './scans.service';
import { NotFoundException } from '@nestjs/common';

describe('ScansService', () => {
  let service: ScansService;

  beforeEach(() => {
    service = new ScansService();
  });

  it('AC1: should track running scan and return phase, files_done, files_total', async () => {
    const scan = service.createScan({
      org_id: 'org_123',
      repository_id: 'repo_abc',
      files_total: 42,
    });

    service.updateScanProgress(scan.id, {
      status: 'running',
      phase: 'PARSING',
      files_done: 18,
    });

    const res = service.getScan('org_123', scan.id);

    expect(res.status).toBe('running');
    expect(res.phase).toBe('PARSING');
    expect(res.files_done).toBe(18);
    expect(res.files_total).toBe(42);
  });

  it('AC2: should track completed scan and return framework, element_count, completed_at', async () => {
    const scan = service.createScan({
      org_id: 'org_123',
      repository_id: 'repo_abc',
      files_total: 10,
    });

    const now = new Date();
    service.updateScanProgress(scan.id, {
      status: 'completed',
      phase: 'COMPLETED',
      files_done: 10,
      framework: 'playwright',
      element_count: 85,
      completed_at: now,
    });

    const res = service.getScan('org_123', scan.id);

    expect(res.status).toBe('completed');
    expect(res.phase).toBe('COMPLETED');
    expect(res.framework).toBe('playwright');
    expect(res.element_count).toBe(85);
    expect(res.completed_at).toEqual(now);
  });

  it('should throw NotFoundException for invalid scanId or wrong orgId', async () => {
    const scan = service.createScan({
      org_id: 'org_123',
      repository_id: 'repo_abc',
    });

    expect(() => service.getScan('org_123', 'scan_missing')).toThrow(NotFoundException);
    expect(() => service.getScan('org_other', scan.id)).toThrow(NotFoundException);
  });
});
