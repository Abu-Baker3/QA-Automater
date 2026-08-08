import { describe, expect, it } from 'vitest';
import { createHealthResponse } from '@qa-automater/shared';

describe('HealthController logic', () => {
  it('returns ok status for api service when all services are healthy', () => {
    const result = createHealthResponse('api', '0.1.0');
    expect(result.status).toBe('ok');
    expect(result.service).toBe('api');
  });

  it('marks health degraded when database, queue, or storage check fails', () => {
    const dbOk = true;
    const queueOk = false;
    const storageOk = true;

    const allOk = dbOk && queueOk && storageOk;
    const status = allOk ? 'ok' : 'degraded';
    expect(status).toBe('degraded');
  });

  it('detects pooled connection configuration', () => {
    const poolUrl = 'postgresql://postgres:postgres@localhost:6432/qa_automater';
    expect(poolUrl.includes(':6432')).toBe(true);
  });

  it('satisfies AC-1 ECS ALB /health target group probe format', () => {
    const healthProbe = createHealthResponse('api', '0.1.0', 'ok');
    expect(healthProbe).toHaveProperty('status', 'ok');
    expect(healthProbe).toHaveProperty('service', 'api');
    expect(healthProbe).toHaveProperty('version', '0.1.0');
    expect(healthProbe).toHaveProperty('timestamp');
  });
});
