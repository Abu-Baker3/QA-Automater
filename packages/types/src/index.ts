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
  props?: ExtractedJsxProp[];
  data_testid?: string;
  aria_label?: string;
  role?: string;
  id?: string;
  name?: string;
  type?: string;
  placeholder?: string;
  text_content?: string;
  html_for?: string;
  label_text?: string;
  source_file?: string;
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
  results: FileParseResult[];
  components?: ExtractedComponent[];
  jsx_elements?: ExtractedJsxElement[];
  file_results?: FileParseResult[];
}

export interface AppRouterRoute {
  route_path: string;
  file_path: string;
  component_name?: string;
  jsx_elements: ExtractedJsxElement[];
}

export interface AppRouterParseResult {
  routes: AppRouterRoute[];
  total_routes: number;
}

export interface ComponentNode {
  id: string;
  file_path: string;
  component_name: string;
  is_page: boolean;
  route_path?: string;
  jsx_elements: ExtractedJsxElement[];
}

export interface ComponentEdge {
  parent_id: string;
  child_id: string;
  imported_as: string;
}

export interface ComponentImportGraph {
  nodes: Record<string, ComponentNode>;
  edges: ComponentEdge[];
  root_route_ids: string[];
}

export type LocatorStrategy =
  'testid' | 'role_name' | 'text' | 'label' | 'placeholder' | 'id' | 'name' | 'css';

export type StabilityTier = 'high' | 'medium' | 'low';

export interface LocatorCandidate {
  strategy: LocatorStrategy;
  value: string;
  score: number;
  playwright_code: string;
  rank: number;
  stability_tier: StabilityTier;
}

export interface ExtractedLocatorElement {
  tag_name: string;
  line_number: number;
  source_file: string;
  source_line: number;
  source_ref: string;
  candidates: LocatorCandidate[];
  primary_candidate: LocatorCandidate;
  stability_tier: StabilityTier;
}

export interface PersistedUiElement {
  id: string;
  scan_id: string;
  tag_name: string;
  source_file: string;
  source_line: number;
  source_ref: string;
  stability_tier: StabilityTier;
  primary_candidate: LocatorCandidate;
  candidates: LocatorCandidate[];
  created_at: string;
}

export interface UiElementDetailResponse {
  id: string;
  scan_id: string;
  tag_name: string;
  source_file: string;
  source_line: number;
  source_ref: string;
  stability_tier: StabilityTier;
  primary_candidate: LocatorCandidate;
  candidates: LocatorCandidate[];
}

export interface UiElementEmbedding {
  id: string;
  element_id: string;
  content_hash: string;
  text_payload: string;
  embedding: number[]; // 1536-dimensional vector
  created_at: string;
  updated_at: string;
}

export interface EmbedBatchElementInput {
  id: string;
  tag_name: string;
  content_hash?: string;
  text_content?: string;
  aria_label?: string;
  data_testid?: string;
  source_ref?: string;
}

export interface EmbedBatchRequest {
  elements: EmbedBatchElementInput[];
}

export interface EmbedBatchResult {
  total_elements: number;
  embedded_count: number;
  skipped_count: number;
  embeddings: UiElementEmbedding[];
}

export interface RepositoryPageItem {
  id: string;
  repository_id: string;
  route_path: string;
  file_path: string;
  component_name?: string;
  element_count: number;
  created_at: string;
}

export interface RepositoryPagesQueryDto {
  search?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface RepositoryPagesResponse {
  data: RepositoryPageItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}
