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

export interface UserStoryDetails {
  id: string;
  user_story_id?: string;
  repository_id?: string;
  org_id?: string;
  title: string;
  description?: string;
  acceptance_criteria?: Array<AcceptanceCriterionInput | string>;
  status?: 'draft' | 'pending' | 'in-progress' | 'complete';
  created_at?: string;
  updated_at?: string;
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

export interface RetrievalChannelScore {
  vector_score: number;
  keyword_score: number;
  graph_score: number;
  fused_score: number;
}

export interface RetrievalTrace {
  step_description: string;
  page_hint?: string;
  repository_id?: string;
  total_candidates_evaluated: number;
  execution_time_ms: number;
  top_candidates: Array<{
    element_id: string;
    tag_name: string;
    route_path?: string;
    scores: RetrievalChannelScore;
  }>;
  channel_breakdown: {
    vector_candidates_count: number;
    keyword_candidates_count: number;
    graph_candidates_count: number;
  };
  timestamp: string;
}

export interface HybridRetrievalRequest {
  step_description: string;
  page_hint?: string;
  repository_id?: string;
  top_k?: number;
}

export interface HybridRetrievalResult {
  step_description: string;
  candidates: ElementSearchResultItem[];
  retrieval_trace: RetrievalTrace;
}

export interface StepLocatorMapping {
  step_id: string;
  step_order?: number;
  element_id: string | null;
  chosen_locator: LocatorCandidate | null;
  confidence: number;
  rationale: string;
  needs_review: boolean;
  human_verified?: boolean;
  candidates?: ElementSearchResultItem[];
  source_ref?: string;
}

export interface ReviewItem {
  step_id: string;
  step_order: number;
  action: string;
  target_description: string;
  confidence: number;
  element_id: string | null;
  chosen_locator: LocatorCandidate | null;
  candidates: ElementSearchResultItem[];
  rationale: string;
  needs_review: boolean;
  human_verified: boolean;
}

export interface MapStepRequest {
  step: TestPlanStep;
  candidates: ElementSearchResultItem[];
}

export interface MappingAgentResult {
  mapping: StepLocatorMapping;
  attempts: number;
  status: 'success' | 'failed';
  error?: string;
}

export type GenerationJobStatus =
  'planning' | 'mapping' | 'review' | 'codegen' | 'completed' | 'failed';

export interface ModelVersionInfo {
  provider: string;
  model: string;
  prompt_version?: string;
  prompt_hash?: string;
  timestamp?: string;
}

export interface ModelVersions {
  story_agent?: ModelVersionInfo;
  mapping_agent?: ModelVersionInfo;
}

export interface PromptEvalDatasetItem {
  id: string;
  story: UserStoryDetails;
  expected_steps_count: number;
  expected_locators?: Record<string, string>;
}

export interface PromptEvalResult {
  eval_run_id: string;
  prompt_version: string;
  prompt_hash: string;
  total_samples: number;
  precision: number;
  baseline_precision?: number;
  precision_delta?: number;
  deploy_blocked: boolean;
  block_reason?: string;
  timestamp: string;
}

export interface PromptEvalOptions {
  max_precision_drop?: number; // Default 0.05 (5%)
}

export interface GenerationJob {
  id: string;
  story_id: string;
  repository_id?: string;
  status: GenerationJobStatus;
  test_plan_ir?: TestPlanIR;
  mappings?: StepLocatorMapping[];
  review_items?: ReviewItem[];
  export_allowed?: boolean;
  model_versions?: ModelVersions;
  error_message?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface StartGenerationRequest {
  story_id: string;
  repository_id?: string;
  user_story?: UserStoryDetails;
}

export interface StartGenerationResponse {
  job_id: string;
  status: GenerationJobStatus;
}

export interface OverrideMappingRequest {
  element_id?: string | null;
  chosen_locator?: LocatorCandidate | null;
  rationale?: string;
}

export interface OverrideMappingResponse {
  job_id: string;
  step_order: number;
  mapping: StepLocatorMapping;
  job: GenerationJob;
}

export type ExportType = 'zip' | 'github_pr';

export interface ExportJobRequest {
  job_id?: string;
  type?: ExportType;
  export_type?: ExportType;
  target_branch?: string;
  target_path?: string;
}

export interface ExportJobResponse {
  job_id: string;
  status: string;
  message: string;
  export_allowed: boolean;
  export_type?: ExportType;
  download_url?: string;
  expires_in_seconds?: number;
  expires_at?: string;
  artifact_key?: string;
  pull_request_url?: string;
  pull_request_number?: number;
  branch_name?: string;
  target_branch?: string;
  target_path?: string;
}

export interface CreatePullRequestOptions {
  orgId: string;
  repositoryId: string;
  jobId: string;
  targetBranch?: string;
  targetPath?: string;
  specFiles: Array<{ filename: string; content: string }>;
  pageObjectFiles: Array<{ filename: string; content: string }>;
  readmeContent?: string;
  envExampleContent?: string;
}

export interface CreatePullRequestResult {
  pull_request_url: string;
  pull_request_number: number;
  branch_name: string;
  target_branch: string;
  target_path: string;
  files_created: string[];
}

export interface ExportBlockedResponse {
  message: string;
  code: 'EXPORT_BLOCKED_UNRESOLVED_REVIEW_ITEMS';
  pending_steps: ReviewItem[];
}

export interface PageObjectGetterDefinition {
  name: string;
  playwright_code: string;
  target_description: string;
  step_order: number;
}

export interface GeneratedPageObjectFile {
  className: string;
  fileName: string;
  filePath: string;
  content: string;
  getters: PageObjectGetterDefinition[];
}

export interface GeneratedSpecFile {
  fileName: string;
  filePath: string;
  content: string;
  pageObjectImports: string[];
}

export interface PlaywrightCodegenOutput {
  pageObjects: GeneratedPageObjectFile[];
  specFile: GeneratedSpecFile;
}

export type CodeValidationRuleId =
  'no-xpath' | 'po-encapsulation' | 'ts-syntax-error' | 'ts-type-error';

export interface CodeValidationDiagnostic {
  rule_id: CodeValidationRuleId;
  file_path: string;
  line_number?: number;
  column_number?: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface CodeValidationResult {
  valid: boolean;
  diagnostics: CodeValidationDiagnostic[];
  passed_rules: CodeValidationRuleId[];
}

export interface GeneratedArtifactMetadata {
  id?: string;
  jobId: string;
  orgId: string;
  filename: string;
  storageKey: string;
  bucket: string;
  sizeBytes: number;
  checksumSha256: string;
  createdAt?: string;
}

export interface ArtifactStorageResult {
  key: string;
  bucket: string;
  size: number;
  checksumSha256: string;
}
