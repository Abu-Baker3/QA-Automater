import { describe, it, expect, beforeEach } from 'vitest';
import { ScansService } from './scans.service';

describe('ScansService — Idempotency (E4.6)', () => {
  let scansService: ScansService;

  beforeEach(() => {
    scansService = new ScansService();
  });

  describe('AC1: Duplicate repo_id + commit_sha scan requests', () => {
    it('should return existing completed scan_id without creating a new scan when same repo_id + commit_sha is already COMPLETED', () => {
      // 1. Initial scan creation
      const scan1 = scansService.createScan({
        org_id: 'org_acme',
        repository_id: 'repo_frontend',
        commit_sha: 'a1b2c3d4e5f6',
        files_total: 50,
      });

      // 2. Mark initial scan as completed
      scansService.updateScanProgress(scan1.id, {
        status: 'completed',
        phase: 'COMPLETED',
        files_done: 50,
        element_count: 120,
      });

      // 3. Re-scan request for the exact same repository_id and commit_sha
      const reScan = scansService.createScan({
        org_id: 'org_acme',
        repository_id: 'repo_frontend',
        commit_sha: 'a1b2c3d4e5f6',
        files_total: 50,
      });

      // Verification: AC1 returns existing scan record & scan_id without re-processing
      expect(reScan.id).toBe(scan1.id);
      expect(reScan.status).toBe('completed');
      expect(reScan.element_count).toBe(120);
    });

    it('should NOT reuse scan if previous scan with same commit_sha is in progress (running or queued) or failed', () => {
      // Scan 1 created and still running
      const scan1 = scansService.createScan({
        org_id: 'org_acme',
        repository_id: 'repo_frontend',
        commit_sha: 'sha_running_123',
        initial_status: 'running',
        initial_phase: 'PARSING',
      });

      // Re-request scan for same commit_sha while scan1 is still running
      const scan2 = scansService.createScan({
        org_id: 'org_acme',
        repository_id: 'repo_frontend',
        commit_sha: 'sha_running_123',
      });

      // Verification: Since scan1 is not completed yet, scan2 is a new distinct scan
      expect(scan2.id).not.toBe(scan1.id);
    });
  });

  describe('AC2: New commit SHA or different repository', () => {
    it('should execute full pipeline and create a new scan job when a new commit_sha is provided for the same repository', () => {
      // Initial completed scan
      const scan1 = scansService.createScan({
        org_id: 'org_acme',
        repository_id: 'repo_frontend',
        commit_sha: 'commit_v1_0_0',
      });
      scansService.updateScanProgress(scan1.id, { status: 'completed', phase: 'COMPLETED' });

      // Scan request for a new commit SHA
      const scan2 = scansService.createScan({
        org_id: 'org_acme',
        repository_id: 'repo_frontend',
        commit_sha: 'commit_v1_1_0',
      });

      // Verification: AC2 full pipeline executes for new commit SHA
      expect(scan2.id).not.toBe(scan1.id);
      expect(scan2.commit_sha).toBe('commit_v1_1_0');
      expect(scan2.status).toBe('queued');
    });

    it('should create a new scan job when same commit_sha is provided for a DIFFERENT repository ID', () => {
      // Completed scan for repo_frontend
      const scan1 = scansService.createScan({
        org_id: 'org_acme',
        repository_id: 'repo_frontend',
        commit_sha: 'shared_sha_123',
      });
      scansService.updateScanProgress(scan1.id, { status: 'completed', phase: 'COMPLETED' });

      // Scan request for repo_backend with the same commit SHA
      const scan2 = scansService.createScan({
        org_id: 'org_acme',
        repository_id: 'repo_backend',
        commit_sha: 'shared_sha_123',
      });

      // Verification: Scans are isolated per repository ID
      expect(scan2.id).not.toBe(scan1.id);
      expect(scan2.repository_id).toBe('repo_backend');
    });
  });
});
