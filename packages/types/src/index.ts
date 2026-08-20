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

export interface ElementSearchQueryDto {
  q?: string;
  page_route?: string;
  repository_id?: string;
  page?: number;
  limit?: number;
}

export interface ElementSearchResultItem {
  id: string;
  scan_id: string;
  repository_id?: string;
  route_path?: string;
  tag_name: string;
  text_content?: string;
  source_ref: string;
  stability_tier: StabilityTier;
  primary_candidate: LocatorCandidate;
  candidates: LocatorCandidate[];
  relevance_score: number;
}

export interface ElementSearchResponse {
  data: ElementSearchResultItem[];
  query_execution_time_ms: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface AcceptanceCriterionInput {
  criterion_id?: string;
  text: string;
  given?: string;
  when?: string;
  then?: string;
}

export interface CreateUserStoryDto {
  title: string;
  description: string;
  acceptance_criteria?: AcceptanceCriterionInput[];
}

export interface UserStoryItem {
  id: string;
  user_story_id: string;
  repository_id: string;
  org_id: string;
  title: string;
  description: string;
  acceptance_criteria: AcceptanceCriterionInput[];
  status: 'draft' | 'pending' | 'in-progress' | 'complete';
  created_at: string;
  updated_at: string;
}

export interface CreateUserStoryResponse {
  user_story_id: string;
  story: UserStoryItem;
}

export interface UserStoryListItem {
  id: string;
  user_story_id: string;
  repository_id: string;
  title: string;
  status: 'draft' | 'pending' | 'in-progress' | 'complete';
  linked_generation_job_status?: string;
  created_at: string;
  updated_at: string;
}

export interface UserStoryListQueryDto {
  search?: string;
  page?: number;
  limit?: number;
}

export interface UserStoryListResponse {
  data: UserStoryListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export type UserStoryDetailResponse = UserStoryItem;

export type LLMProviderName = 'openai' | 'anthropic' | 'mock';

export interface LLMCompletionPrompt {
  userPrompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMJsonSchema<T = unknown> {
  name: string;
  description?: string;
  schema: Record<string, unknown>;
  validator?: (data: unknown) => data is T;
}

export interface LLMCompletionUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMCompletionResponse<T = unknown> {
  data: T;
  rawText: string;
  provider: LLMProviderName;
  model: string;
  usage?: LLMCompletionUsage;
}

export interface LLMProviderConfig {
  primaryProvider?: LLMProviderName;
  fallbackProvider?: LLMProviderName;
  fallbackEnabled?: boolean;
  openaiApiKey?: string;
  openaiModel?: string;
  anthropicApiKey?: string;
  anthropicModel?: string;
}

export type TestStepAction = 'navigate' | 'fill' | 'click' | 'assert' | 'select' | 'wait';

export interface TestPlanStep {
  step_id: string;
  action: TestStepAction;
  target_description: string;
  value?: string;
  expected_outcome: string;
  page_hint?: string;
}

export interface TestPlanIR {
  user_story_id: string;
  title: string;
  summary: string;
  steps: TestPlanStep[];
}

export interface StoryDecompositionResult {
  test_plan: TestPlanIR;
  attempts: number;
  status: 'success' | 'failed';
  error?: string;
}
