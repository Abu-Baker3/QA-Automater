import { describe, expect, it } from 'vitest';
import { createHealthResponse, getEnvOrDefault } from './index';

describe('@qa-automater/shared', () => {
  it('createHealthResponse returns valid health payload', () => {
    const health = createHealthResponse('api', '1.0.0');
    expect(health.service).toBe('api');
    expect(health.status).toBe('ok');
    expect(health.version).toBe('1.0.0');
  });

  it('getEnvOrDefault returns fallback when unset', () => {
    delete process.env.TEST_VAR_E1;
    expect(getEnvOrDefault('TEST_VAR_E1', 'fallback')).toBe('fallback');
  });
});
