import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScansService, FREE_TIER_DAILY_SCAN_LIMIT } from './scans.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { EventsGateway } from '../events/events.gateway';

describe('ScansService — Concurrency & Quota Enforcement (E4.5)', () => {
  let service: ScansService;
  let mockEventsGateway: EventsGateway;

  beforeEach(() => {
    mockEventsGateway = {
      emitScanProgress: vi.fn().mockResolvedValue(undefined),
      emitScanComplete: vi.fn().mockResolvedValue(undefined),
    } as unknown as EventsGateway;

    service = new ScansService(mockEventsGateway);
  });

  describe('AC1: Concurrent Scan Limits per Tenant (Max 2 running)', () => {
    it('allows up to 2 concurrent running scans for an organization', () => {
      const scan1 = service.createScan({
        org_id: 'org_ac1',
        repository_id: 'repo_1',
        plan_tier: 'pro',
        initial_status: 'running',
        initial_phase: 'CLONING',
      });
      const scan2 = service.createScan({
        org_id: 'org_ac1',
        repository_id: 'repo_2',
        plan_tier: 'pro',
        initial_status: 'running',
        initial_phase: 'CLONING',
      });

      expect(scan1.status).toBe('running');
      expect(scan1.phase).toBe('CLONING');

      expect(scan2.status).toBe('running');
      expect(scan2.phase).toBe('CLONING');

      expect(service.getRunningScansCount('org_ac1')).toBe(2);
    });

    it('queues 3rd scan when org already has 2 running scans', () => {
      const scan1 = service.createScan({
        org_id: 'org_ac1',
        repository_id: 'repo_1',
        plan_tier: 'pro',
        initial_status: 'running',
        initial_phase: 'CLONING',
      });
      const scan2 = service.createScan({
        org_id: 'org_ac1',
        repository_id: 'repo_2',
        plan_tier: 'pro',
        initial_status: 'running',
        initial_phase: 'CLONING',
      });

      // 3rd scan requested as running -> capacity full -> forced to queued
      const scan3 = service.createScan({
        org_id: 'org_ac1',
        repository_id: 'repo_3',
        plan_tier: 'pro',
        initial_status: 'running',
        initial_phase: 'CLONING',
      });

      expect(scan1.status).toBe('running');
      expect(scan2.status).toBe('running');
      expect(scan3.status).toBe('queued');
      expect(scan3.phase).toBe('QUEUED');
      expect(service.getRunningScansCount('org_ac1')).toBe(2);
    });

    it('auto-promotes 3rd queued scan when 1st running scan completes', () => {
      const scan1 = service.createScan({
        org_id: 'org_ac1',
        repository_id: 'repo_1',
        plan_tier: 'pro',
        initial_status: 'running',
        initial_phase: 'CLONING',
      });
      service.createScan({
        org_id: 'org_ac1',
        repository_id: 'repo_2',
        plan_tier: 'pro',
        initial_status: 'running',
        initial_phase: 'CLONING',
      });
      const scan3 = service.createScan({
        org_id: 'org_ac1',
        repository_id: 'repo_3',
        plan_tier: 'pro',
        initial_status: 'running',
        initial_phase: 'CLONING',
      });

      expect(scan3.status).toBe('queued');

      // Complete scan1
      service.updateScanProgress(scan1.id, {
        status: 'completed',
        phase: 'COMPLETED',
        element_count: 50,
      });

      // scan3 should now be promoted to running
      const updatedScan3 = service.getScan('org_ac1', scan3.id);
      expect(updatedScan3.status).toBe('running');
      expect(updatedScan3.phase).toBe('CLONING');
    });

    it('isolates concurrent scan limits per organization tenant', () => {
      service.createScan({
        org_id: 'org_A',
        repository_id: 'repo_A1',
        plan_tier: 'pro',
        initial_status: 'running',
      });
      service.createScan({
        org_id: 'org_A',
        repository_id: 'repo_A2',
        plan_tier: 'pro',
        initial_status: 'running',
      });

      // Org A is maxed at 2 running scans
      expect(service.getRunningScansCount('org_A')).toBe(2);

      // Org B can still start a scan immediately
      const scanB = service.createScan({
        org_id: 'org_B',
        repository_id: 'repo_B1',
        plan_tier: 'pro',
        initial_status: 'running',
      });
      expect(scanB.status).toBe('running');
      expect(service.getRunningScansCount('org_B')).toBe(1);
    });
  });

  describe('AC2: Daily Scan Quota Enforcement for Free Plan Tier', () => {
    it('allows up to 10 daily scans for free plan tier org', () => {
      for (let i = 0; i < FREE_TIER_DAILY_SCAN_LIMIT; i++) {
        expect(() => {
          service.createScan({
            org_id: 'org_free',
            repository_id: `repo_${i}`,
            plan_tier: 'free',
          });
        }).not.toThrow();
      }

      expect(service.getDailyScansCount('org_free')).toBe(10);
    });

    it('returns HTTP 429 Too Many Requests when free tier org exceeds daily scan quota', () => {
      // Create 10 scans
      for (let i = 0; i < FREE_TIER_DAILY_SCAN_LIMIT; i++) {
        service.createScan({
          org_id: 'org_free_limit',
          repository_id: `repo_${i}`,
          plan_tier: 'free',
        });
      }

      // 11th scan should throw HTTP 429
      try {
        service.createScan({
          org_id: 'org_free_limit',
          repository_id: 'repo_11',
          plan_tier: 'free',
        });
        expect.unreachable('Should have thrown HTTP 429 Exception');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(HttpException);
        const httpErr = err as HttpException;
        expect(httpErr.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const response = httpErr.getResponse() as { error: string; message: string };
        expect(response.error).toBe('Too Many Requests');
        expect(response.message).toContain('Daily scan quota exceeded for Free plan tier');
      }
    });

    it('allows pro plan tier orgs to bypass free tier daily scan quota', () => {
      for (let i = 0; i < FREE_TIER_DAILY_SCAN_LIMIT + 5; i++) {
        expect(() => {
          service.createScan({
            org_id: 'org_pro',
            repository_id: `repo_${i}`,
            plan_tier: 'pro',
          });
        }).not.toThrow();
      }

      expect(service.getDailyScansCount('org_pro')).toBe(15);
    });
  });
});
