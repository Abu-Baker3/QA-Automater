export interface PagerDutyAlertPayload {
  routing_key: string;
  event_action: 'trigger' | 'acknowledge' | 'resolve';
  dedup_key?: string;
  payload: {
    summary: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    source: string;
    timestamp?: string;
    component?: string;
    group?: string;
    class?: string;
    custom_details?: Record<string, unknown>;
  };
}

export interface MetricEvent {
  status: 'success' | 'failure' | 'error';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface RateMetrics {
  total: number;
  failures: number;
  rate: number;
}

export interface AlertEvent {
  type: 'SCAN_FAILURE_RATE' | 'LLM_ERROR_RATE';
  rate: number;
  threshold: number;
  details: Record<string, unknown>;
  pagerDutyPayload?: PagerDutyAlertPayload;
}

export class AlertManager {
  private readonly scanEvents: MetricEvent[] = [];
  private readonly llmEvents: MetricEvent[] = [];
  private readonly firedAlerts: AlertEvent[] = [];
  private readonly alertListeners: Array<(alert: AlertEvent) => void> = [];

  private readonly scanWindowMs: number;
  private readonly scanFailureThreshold: number;
  private readonly llmWindowMs: number;
  private readonly llmErrorThreshold: number;
  private readonly minSampleSize: number;

  constructor(options?: {
    scanWindowMs?: number;
    scanFailureThreshold?: number;
    llmWindowMs?: number;
    llmErrorThreshold?: number;
    minSampleSize?: number;
  }) {
    this.scanWindowMs = options?.scanWindowMs ?? 60 * 60 * 1000; // 1 hour
    this.scanFailureThreshold = options?.scanFailureThreshold ?? 0.05; // 5%
    this.llmWindowMs = options?.llmWindowMs ?? 60 * 60 * 1000; // 1 hour
    this.llmErrorThreshold = options?.llmErrorThreshold ?? 0.02; // 2%
    this.minSampleSize = options?.minSampleSize ?? 5;
  }

  /**
   * Records a repository scan outcome and checks failure threshold (Story E14.3 AC1).
   */
  recordScanOutcome(
    status: 'success' | 'failure',
    timestamp: number = Date.now(),
    metadata?: Record<string, unknown>,
  ): AlertEvent | null {
    this.scanEvents.push({ status, timestamp, metadata });
    this.pruneOldEvents();
    return this.checkScanFailureAlert();
  }

  /**
   * Computes the scan failure rate over the sliding 1-hour window.
   */
  getScanMetrics(now: number = Date.now()): RateMetrics {
    const cutoff = now - this.scanWindowMs;
    const windowEvents = this.scanEvents.filter((e) => e.timestamp >= cutoff);
    const total = windowEvents.length;
    const failures = windowEvents.filter((e) => e.status === 'failure').length;
    const rate = total > 0 ? failures / total : 0;

    return { total, failures, rate };
  }

  /**
   * Story E14.3 AC1: Given scan failure rate >5% over 1h When threshold breached Then PagerDuty alert fires
   */
  checkScanFailureAlert(now: number = Date.now()): AlertEvent | null {
    const metrics = this.getScanMetrics(now);

    if (metrics.total >= this.minSampleSize && metrics.rate > this.scanFailureThreshold) {
      const payload: PagerDutyAlertPayload = {
        routing_key: process.env.PAGERDUTY_ROUTING_KEY || 'pd-routing-key-default',
        event_action: 'trigger',
        dedup_key: `alert:scan_failure_rate:${Math.floor(now / (15 * 60 * 1000))}`,
        payload: {
          summary: `High Scan Failure Rate: ${(metrics.rate * 100).toFixed(1)}% (Threshold: ${(this.scanFailureThreshold * 100).toFixed(1)}%) over 1h window`,
          severity: 'error',
          source: 'qa-automater-scan-worker',
          timestamp: new Date(now).toISOString(),
          component: 'scan-pipeline',
          custom_details: {
            window_duration: '1h',
            total_scans: metrics.total,
            failed_scans: metrics.failures,
            failure_rate_percentage: metrics.rate * 100,
          },
        },
      };

      const alert: AlertEvent = {
        type: 'SCAN_FAILURE_RATE',
        rate: metrics.rate,
        threshold: this.scanFailureThreshold,
        details: { ...metrics, window: '1h' },
        pagerDutyPayload: payload,
      };

      this.firedAlerts.push(alert);
      this.notifyListeners(alert);
      return alert;
    }

    return null;
  }

  /**
   * Records an LLM call outcome and checks error threshold (Story E14.3 AC2).
   */
  recordLlmOutcome(
    status: 'success' | 'error' | 'failure',
    timestamp: number = Date.now(),
    metadata?: Record<string, unknown>,
  ): AlertEvent | null {
    this.llmEvents.push({ status, timestamp, metadata });
    this.pruneOldEvents();
    return this.checkLlmErrorAlert();
  }

  /**
   * Computes the LLM error rate over the sliding 1-hour window.
   */
  getLlmMetrics(now: number = Date.now()): RateMetrics {
    const cutoff = now - this.llmWindowMs;
    const windowEvents = this.llmEvents.filter((e) => e.timestamp >= cutoff);
    const total = windowEvents.length;
    const failures = windowEvents.filter(
      (e) => e.status === 'error' || e.status === 'failure',
    ).length;
    const rate = total > 0 ? failures / total : 0;

    return { total, failures, rate };
  }

  /**
   * Story E14.3 AC2: Given LLM error rate >2% When threshold breached Then alert fires
   */
  checkLlmErrorAlert(now: number = Date.now()): AlertEvent | null {
    const metrics = this.getLlmMetrics(now);

    if (metrics.total >= this.minSampleSize && metrics.rate > this.llmErrorThreshold) {
      const payload: PagerDutyAlertPayload = {
        routing_key: process.env.PAGERDUTY_ROUTING_KEY || 'pd-routing-key-default',
        event_action: 'trigger',
        dedup_key: `alert:llm_error_rate:${Math.floor(now / (15 * 60 * 1000))}`,
        payload: {
          summary: `High LLM Error Rate: ${(metrics.rate * 100).toFixed(1)}% (Threshold: ${(this.llmErrorThreshold * 100).toFixed(1)}%) over 1h window`,
          severity: 'critical',
          source: 'qa-automater-llm-service',
          timestamp: new Date(now).toISOString(),
          component: 'llm-service',
          custom_details: {
            window_duration: '1h',
            total_llm_calls: metrics.total,
            failed_llm_calls: metrics.failures,
            error_rate_percentage: metrics.rate * 100,
          },
        },
      };

      const alert: AlertEvent = {
        type: 'LLM_ERROR_RATE',
        rate: metrics.rate,
        threshold: this.llmErrorThreshold,
        details: { ...metrics, window: '1h' },
        pagerDutyPayload: payload,
      };

      this.firedAlerts.push(alert);
      this.notifyListeners(alert);
      return alert;
    }

    return null;
  }

  onAlert(listener: (alert: AlertEvent) => void): () => void {
    this.alertListeners.push(listener);
    return () => {
      const idx = this.alertListeners.indexOf(listener);
      if (idx !== -1) this.alertListeners.splice(idx, 1);
    };
  }

  getFiredAlerts(): AlertEvent[] {
    return [...this.firedAlerts];
  }

  reset(): void {
    this.scanEvents.length = 0;
    this.llmEvents.length = 0;
    this.firedAlerts.length = 0;
  }

  private pruneOldEvents(now: number = Date.now()): void {
    const scanCutoff = now - this.scanWindowMs;
    const llmCutoff = now - this.llmWindowMs;

    while (this.scanEvents.length > 0 && (this.scanEvents[0]?.timestamp ?? 0) < scanCutoff) {
      this.scanEvents.shift();
    }

    while (this.llmEvents.length > 0 && (this.llmEvents[0]?.timestamp ?? 0) < llmCutoff) {
      this.llmEvents.shift();
    }
  }

  private notifyListeners(alert: AlertEvent): void {
    for (const listener of this.alertListeners) {
      try {
        listener(alert);
      } catch (err) {
        console.error('Error in alert listener:', err);
      }
    }
  }
}

/**
 * Structured JSON logging utility with automatic token masking & metadata enrichment.
 */
export interface StructuredLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;
  event: string;
  message: string;
  trace_id?: string;
  span_id?: string;
  org_id?: string;
  repo_id?: string;
  scan_id?: string;
  job_id?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  attributes?: Record<string, unknown>;
}

export class StructuredLogger {
  constructor(private readonly serviceName: string) {}

  formatEntry(
    level: 'info' | 'warn' | 'error' | 'debug',
    event: string,
    message: string,
    context?: Partial<StructuredLogEntry>,
  ): string {
    const sanitizedMsg = this.sanitize(message);

    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      event,
      message: sanitizedMsg,
      ...context,
    };

    return JSON.stringify(entry);
  }

  logInfo(event: string, message: string, context?: Partial<StructuredLogEntry>): string {
    const formatted = this.formatEntry('info', event, message, context);
    console.log(formatted);
    return formatted;
  }

  logError(
    event: string,
    message: string,
    error?: Error,
    context?: Partial<StructuredLogEntry>,
  ): string {
    const errorDetails = error
      ? {
          name: error.name,
          message: this.sanitize(error.message),
          stack: error.stack ? this.sanitize(error.stack) : undefined,
        }
      : undefined;

    const formatted = this.formatEntry('error', event, message, {
      ...context,
      error: errorDetails,
    });
    console.error(formatted);
    return formatted;
  }

  private sanitize(text: string): string {
    if (!text) return '';
    return text
      .replace(/(ghp_[a-zA-Z0-9]{20,})/g, '[REDACTED_GITHUB_TOKEN]')
      .replace(/(gho_[a-zA-Z0-9]{20,})/g, '[REDACTED_GITHUB_TOKEN]')
      .replace(/(ghs_[a-zA-Z0-9]{20,})/g, '[REDACTED_GITHUB_TOKEN]')
      .replace(/(github_pat_[a-zA-Z0-9_]{20,})/g, '[REDACTED_GITHUB_TOKEN]')
      .replace(/(sk-[a-zA-Z0-9]{20,})/g, '[REDACTED_OPENAI_KEY]');
  }
}
