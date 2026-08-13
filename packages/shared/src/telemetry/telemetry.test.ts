import { describe, it, expect, vi } from 'vitest';
import {
  initTelemetry,
  injectTraceContext,
  withExtractedTraceContext,
  withSpan,
  incrementCounter,
  recordHistogram,
} from './index';

describe('OpenTelemetry Baseline Utility', () => {
  it('should initialize telemetry without throwing error in test mode', () => {
    const sdk = initTelemetry('test-service');
    // Disabled in test environment by default
    expect(sdk).toBeNull();
  });

  it('should inject trace context into carrier object', () => {
    const payload = { jobId: 'job-123', name: 'scan-repo' };
    const injected = injectTraceContext(payload);

    expect(injected).toHaveProperty('jobId', 'job-123');
    expect(injected).toHaveProperty('name', 'scan-repo');
  });

  it('should execute callback with extracted trace context', () => {
    const carrier = { traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01' };
    const fn = vi.fn().mockReturnValue('success');

    const result = withExtractedTraceContext(carrier, fn);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(result).toBe('success');
  });

  it('should execute wrapped withSpan function successfully', async () => {
    const result = await withSpan('test-tracer', 'test-span', async (span) => {
      span.setAttribute('test.attr', 'value');
      return 'span-output';
    });

    expect(result).toBe('span-output');
  });

  it('should propagate errors out of withSpan and record exception', async () => {
    await expect(
      withSpan('test-tracer', 'failing-span', async () => {
        throw new Error('something failed');
      }),
    ).rejects.toThrow('something failed');
  });

  it('should increment metrics counter and record histogram without throwing', () => {
    expect(() => incrementCounter('test-meter', 'test_counter', 1, { env: 'test' })).not.toThrow();
    expect(() =>
      recordHistogram('test-meter', 'test_histogram', 42, { env: 'test' }),
    ).not.toThrow();
  });
});
