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

export interface ExtractedJsxProp {
  name: string;
  value: string;
}

export interface ExtractedJsxElement {
  tag_name: string;
  line_number: number;
  props: ExtractedJsxProp[];
  data_testid?: string;
  aria_label?: string;
  role?: string;
  id?: string;
  name?: string;
  type?: string;
}

export interface ExtractedComponent {
  name: string;
  file_path: string;
  is_export: boolean;
  jsx_elements: ExtractedJsxElement[];
}

export interface FileParseResult {
  file_path: string;
  parse_failed: boolean;
  error?: string;
  components: ExtractedComponent[];
  jsx_elements: ExtractedJsxElement[];
}

export interface RepositoryParseResult {
  total_files: number;
  parsed_files: number;
  failed_files: number;
  components: ExtractedComponent[];
  jsx_elements: ExtractedJsxElement[];
  file_results: FileParseResult[];
}

