import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AlertManager, StructuredLogger } from './alerting';

describe('Structured Logging and Alerting (Story E14.3 AC1 & AC2)', () => {
  let alertManager: AlertManager;

  beforeEach(() => {
    alertManager = new AlertManager({
      scanWindowMs: 60 * 60 * 1000, // 1 hour
      scanFailureThreshold: 0.05, // 5%
      llmWindowMs: 60 * 60 * 1000, // 1 hour
      llmErrorThreshold: 0.02, // 2%
      minSampleSize: 5,
    });
    alertManager.reset();
  });

  describe('Scan Failure Rate Alerting (AC1: >5% failure rate over 1h -> PagerDuty alert)', () => {
    it('does not fire alert when scan failure rate is <= 5%', () => {
      const now = Date.now();

      // 19 successes and 1 failure out of 20 scans = 5.0% failure rate
      for (let i = 0; i < 19; i++) {
        alertManager.recordScanOutcome('success', now);
      }
      const alert = alertManager.recordScanOutcome('failure', now);

      expect(alert).toBeNull();
      const metrics = alertManager.getScanMetrics(now);
      expect(metrics.total).toBe(20);
      expect(metrics.failures).toBe(1);
      expect(metrics.rate).toBe(0.05);
      expect(alertManager.getFiredAlerts()).toHaveLength(0);
    });

    it('fires PagerDuty alert when scan failure rate exceeds 5% over 1h window', () => {
      const now = Date.now();
      const alertListener = vi.fn();
      alertManager.onAlert(alertListener);

      // 18 successes and 2 failures out of 20 scans = 10.0% failure rate (> 5%)
      for (let i = 0; i < 18; i++) {
        alertManager.recordScanOutcome('success', now);
      }
      alertManager.recordScanOutcome('failure', now);
      const alert = alertManager.recordScanOutcome('failure', now);

      expect(alert).not.toBeNull();
      expect(alert?.type).toBe('SCAN_FAILURE_RATE');
      expect(alert?.rate).toBe(0.1);
      expect(alert?.threshold).toBe(0.05);
      expect(alert?.pagerDutyPayload).toBeDefined();
      expect(alert?.pagerDutyPayload?.payload.severity).toBe('error');
      expect(alert?.pagerDutyPayload?.payload.summary).toContain('High Scan Failure Rate: 10.0%');
      expect(alertListener).toHaveBeenCalledWith(alert);
    });

    it('prunes scan events older than 1 hour from rate calculations', () => {
      const now = Date.now();
      const twoHoursAgo = now - 2 * 60 * 60 * 1000;

      // 10 old failures 2 hours ago
      for (let i = 0; i < 10; i++) {
        alertManager.recordScanOutcome('failure', twoHoursAgo);
      }

      // 10 recent successes now
      for (let i = 0; i < 10; i++) {
        alertManager.recordScanOutcome('success', now);
      }

      const metrics = alertManager.getScanMetrics(now);
      expect(metrics.total).toBe(10);
      expect(metrics.failures).toBe(0);
      expect(metrics.rate).toBe(0);
    });
  });

  describe('LLM Error Rate Alerting (AC2: >2% error rate over 1h -> alert fires)', () => {
    it('does not fire alert when LLM error rate is <= 2%', () => {
      const now = Date.now();

      // 98 successes and 2 errors out of 100 LLM calls = 2.0% error rate
      for (let i = 0; i < 98; i++) {
        alertManager.recordLlmOutcome('success', now);
      }
      const alert = alertManager.recordLlmOutcome('error', now);

      expect(alert).toBeNull();
      const metrics = alertManager.getLlmMetrics(now);
      expect(metrics.total).toBe(99);
      expect(metrics.failures).toBe(1);
      expect(metrics.rate).toBeLessThanOrEqual(0.02);
    });

    it('fires alert when LLM error rate exceeds 2% over 1h window', () => {
      const now = Date.now();

      // 47 successes and 3 errors out of 50 LLM calls = 6.0% error rate (> 2%)
      for (let i = 0; i < 47; i++) {
        alertManager.recordLlmOutcome('success', now);
      }
      alertManager.recordLlmOutcome('error', now);
      alertManager.recordLlmOutcome('error', now);
      const alert = alertManager.recordLlmOutcome('failure', now);

      expect(alert).not.toBeNull();
      expect(alert?.type).toBe('LLM_ERROR_RATE');
      expect(alert?.rate).toBe(0.06);
      expect(alert?.threshold).toBe(0.02);
      expect(alert?.pagerDutyPayload?.payload.severity).toBe('critical');
      expect(alert?.pagerDutyPayload?.payload.summary).toContain('High LLM Error Rate: 6.0%');
    });

    it('prunes LLM error events older than 1 hour', () => {
      const now = Date.now();
      const ninetyMinutesAgo = now - 90 * 60 * 1000;

      // 5 old failures 90 mins ago
      for (let i = 0; i < 5; i++) {
        alertManager.recordLlmOutcome('error', ninetyMinutesAgo);
      }

      // 10 new successes now
      for (let i = 0; i < 10; i++) {
        alertManager.recordLlmOutcome('success', now);
      }

      const metrics = alertManager.getLlmMetrics(now);
      expect(metrics.total).toBe(10);
      expect(metrics.failures).toBe(0);
      expect(metrics.rate).toBe(0);
    });
  });

  describe('StructuredLogger Utility', () => {
    it('produces valid JSON log entry with service and metadata', () => {
      const logger = new StructuredLogger('api-service');
      const output = logger.formatEntry('info', 'SCAN_STARTED', 'Repository scan initiated', {
        org_id: 'org_acme',
        repo_id: 'repo_backend',
        scan_id: 'scan_101',
      });

      const parsed = JSON.parse(output);
      expect(parsed.service).toBe('api-service');
      expect(parsed.level).toBe('info');
      expect(parsed.event).toBe('SCAN_STARTED');
      expect(parsed.message).toBe('Repository scan initiated');
      expect(parsed.org_id).toBe('org_acme');
      expect(parsed.timestamp).toBeDefined();
    });

    it('sanitizes GitHub tokens and OpenAI keys from structured log messages', () => {
      const logger = new StructuredLogger('scan-worker');
      const output = logger.formatEntry(
        'error',
        'AUTH_ERROR',
        'Failed auth with token gho_1234567890abcdefghijklmnopqrstuvwxyz and sk-abcdef1234567890abcdef123456',
      );

      const parsed = JSON.parse(output);
      expect(parsed.message).not.toContain('gho_1234567890abcdefghijklmnopqrstuvwxyz');
      expect(parsed.message).not.toContain('sk-abcdef1234567890abcdef123456');
      expect(parsed.message).toContain('[REDACTED_GITHUB_TOKEN]');
      expect(parsed.message).toContain('[REDACTED_OPENAI_KEY]');
    });
  });
});
