import type { HealthCheckResponse, ServiceName } from '@qa-automater/types';

export function createHealthResponse(
  service: ServiceName,
  version: string,
  status: HealthCheckResponse['status'] = 'ok',
): HealthCheckResponse {
  return {
    status,
    service,
    timestamp: new Date().toISOString(),
    version,
  };
}

export function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export { startHealthServer } from './health-server';
export type { HealthServerOptions } from './health-server';

export * from './storage';
export * from './queue';
export * from './telemetry';
export * from './events/pubsub';
export * from './llm';
export * from './rag';
