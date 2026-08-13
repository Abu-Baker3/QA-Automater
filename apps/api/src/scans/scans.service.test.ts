import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScansService } from './scans.service';
import { NotFoundException } from '@nestjs/common';
import type { EventsGateway } from '../events/events.gateway';

describe('ScansService', () => {
  let service: ScansService;
  let mockEventsGateway: EventsGateway;

  beforeEach(() => {
    mockEventsGateway = {
      emitScanProgress: vi.fn().mockResolvedValue(undefined),
      emitScanComplete: vi.fn().mockResolvedValue(undefined),
    } as unknown as EventsGateway;

    service = new ScansService(mockEventsGateway);
  });

  it('AC1: should track running scan and return phase, files_done, files_total and emit scan.progress', async () => {
    const scan = service.createScan({
      org_id: 'org_123',
      repository_id: 'repo_abc',
      files_total: 42,
    });

    expect(mockEventsGateway.emitScanProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        scan_id: scan.id,
        phase: 'QUEUED',
        percent: 0,
      }),
    );

    service.updateScanProgress(scan.id, {
      status: 'running',
      phase: 'PARSING',
      files_done: 21,
    });

    const res = service.getScan('org_123', scan.id);

    expect(res.status).toBe('running');
    expect(res.phase).toBe('PARSING');
    expect(res.files_done).toBe(21);
    expect(res.files_total).toBe(42);

    expect(mockEventsGateway.emitScanProgress).toHaveBeenCalledWith({
      scan_id: scan.id,
      phase: 'PARSING',
      percent: 50,
      files_done: 21,
      files_total: 42,
    });
  });

  it('AC2: should track completed scan and emit scan.complete event', async () => {
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

    expect(mockEventsGateway.emitScanComplete).toHaveBeenCalledWith({
      scan_id: scan.id,
      element_count: 85,
      framework: 'playwright',
    });
  });

  it('calculates fallback phase-based percentages when files_total is 0', () => {
    const scan = service.createScan({ org_id: 'org_1', repository_id: 'repo_1' });
    expect(service.calculatePercent(scan)).toBe(0);

    scan.phase = 'CLONING';
    expect(service.calculatePercent(scan)).toBe(20);

    scan.phase = 'PARSING';
    expect(service.calculatePercent(scan)).toBe(50);

    scan.phase = 'INDEXING';
    expect(service.calculatePercent(scan)).toBe(80);

    scan.phase = 'COMPLETED';
    expect(service.calculatePercent(scan)).toBe(100);
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
