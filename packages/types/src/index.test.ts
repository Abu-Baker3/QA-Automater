import { describe, expect, it } from 'vitest';
import type { HealthCheckResponse } from './index';

describe('@qa-automater/types', () => {
  it('exports HealthCheckResponse shape', () => {
    const health: HealthCheckResponse = {
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    };
    expect(health.status).toBe('ok');
  });
});
