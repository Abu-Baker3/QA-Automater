import { describe, it, expect, beforeEach } from 'vitest';
import { ScansController } from './scans.controller';
import { ScansService } from './scans.service';
import { NotFoundException } from '@nestjs/common';

describe('ScansController', () => {
  let controller: ScansController;
  let service: ScansService;

  beforeEach(() => {
    service = new ScansService();
    controller = new ScansController(service);
  });

  it('AC1: GET /scans/:id should return running scan status with phase, files_done, files_total', async () => {
    const scan = service.createScan({
      org_id: 'org_test',
      repository_id: 'repo_999',
      files_total: 100,
    });

    service.updateScanProgress(scan.id, {
      status: 'running',
      phase: 'CLONING',
      files_done: 25,
    });

    const res = await controller.getScan(scan.id, 'org_test');

    expect(res.id).toBe(scan.id);
    expect(res.phase).toBe('CLONING');
    expect(res.files_done).toBe(25);
    expect(res.files_total).toBe(100);
  });

  it('AC2: GET /scans/:id should return completed scan status with framework, element_count, completed_at', async () => {
    const scan = service.createScan({
      org_id: 'org_test',
      repository_id: 'repo_999',
      files_total: 50,
    });

    const completedAt = new Date();
    service.updateScanProgress(scan.id, {
      status: 'completed',
      phase: 'COMPLETED',
      files_done: 50,
      framework: 'cypress',
      element_count: 140,
      completed_at: completedAt,
    });

    const res = await controller.getScan(scan.id, 'org_test');

    expect(res.id).toBe(scan.id);
    expect(res.status).toBe('completed');
    expect(res.framework).toBe('cypress');
    expect(res.element_count).toBe(140);
    expect(res.completed_at).toEqual(completedAt);
  });

  it('GET /scans/:id should throw NotFoundException for unknown scan ID', async () => {
    await expect(controller.getScan('scan_missing', 'org_test')).rejects.toThrow(
      NotFoundException,
    );
  });
});
