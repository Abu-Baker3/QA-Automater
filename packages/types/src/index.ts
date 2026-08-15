export type ServiceName = 'web' | 'api' | 'ai-worker' | 'scan-worker' | 'export-worker';

export type FrameworkType = 'NEXTJS' | 'REACT';

export type HealthStatus = 'ok' | 'degraded' | 'error';

export interface HealthCheckResponse {
  status: HealthStatus;
  service: ServiceName;
  timestamp: string;
  version: string;
}

export type JobStatus = 'queued' | 'running' | 'complete' | 'failed';

export interface ApiErrorResponse {
  type: string;
  title: string;
  status: number;
  detail?: string;
}

export type WebSocketEventType =
  'scan.progress' | 'scan.complete' | 'generation.status' | 'generation.review_required';

export interface ScanProgressPayload {
  scan_id: string;
  phase: string;
  percent: number;
  files_done?: number;
  files_total?: number;
}

export interface ScanCompletePayload {
  scan_id: string;
  element_count: number;
  framework?: string;
}

export interface WebSocketMessage<T = unknown> {
  event: WebSocketEventType;
  data: T;
  timestamp: string;
}
