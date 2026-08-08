---
title: QA Automater — System Architecture
created: 2026-06-21
updated: 2026-06-21
status: final
version: 1.0
source_prd: ../prds/prd-QA-Automater-2026-06-21/prd.md
document_type: System Architecture Design
---

# System Architecture Design: QA Automater

**Author:** Solution Architecture  
**Audience:** Engineering leads, backend/AI/frontend teams, DevOps, security review  
**Scope:** MVP (Phase 1) with explicit extension points for Phase 2–3

---

## 1. System Overview

### High-Level System Description

QA Automater is a **multi-tenant AI SaaS platform** composed of:

1. A **web dashboard** for org management, repo connection, UI Knowledge Base exploration, story submission, mapping review, and artifact export  
2. A **stateless API tier** enforcing auth, tenancy, and orchestration  
3. **Async worker services** for CPU-bound parsing and I/O-bound Git/LLM operations  
4. A **persistent data plane** (PostgreSQL + pgvector + Redis + S3) holding tenant metadata, UI graphs, embeddings, generation jobs, and generated artifacts  
5. An **AI pipeline** that transforms User Stories into a structured **Test Plan IR**, maps steps to extracted locators via hybrid RAG, and drives template-based Playwright codegen  

The system never executes customer tests in MVP. It **reads source code**, **writes test code**.

### Core Idea (Technical Terms)

> **Static frontend AST analysis → UI Knowledge Graph + vector index → LLM-orchestrated requirement-to-locator mapping → deterministic template codegen**

Key invariant: **No direct User Story → Playwright code generation.** All paths pass through validated intermediate representations with retrieval grounding and confidence gating.

### Main System Objective

| Objective | Measurable target (MVP) |
|-----------|-------------------------|
| Index a React/Next.js repo into queryable UI KB | <5 min median for 500 files |
| Map user story steps to source-traced locators | ≥80% precision on golden flows |
| Export compilable Playwright TS + Page Objects | ≥95% compile rate |
| Enforce tenant isolation and encrypted repo storage | Zero cross-tenant data leakage |
| Scale horizontally via stateless workers | 100 beta tenants, 2 concurrent scans/tenant |

---

## 2. High-Level Architecture

### Component Diagram

```
                                    ┌──────────────────────┐
                                    │   CDN (static assets) │
                                    └──────────┬───────────┘
                                               │
┌──────────────┐                    ┌──────────▼───────────┐
│   Browser    │◄──── HTTPS ───────►│  Web App (Next.js)   │
│  (Dashboard) │                    │  SSR + client routes  │
└──────────────┘                    └──────────┬───────────┘
                                               │ REST + WS
                                    ┌──────────▼───────────┐
                                    │     API Gateway       │
                                    │  (NestJS / FastAPI)   │
                                    │  Auth · RBAC · Rate   │
                                    └──────────┬───────────┘
           ┌───────────────────────────────────┼───────────────────────────────────┐
           │                                   │                                   │
┌──────────▼──────────┐              ┌───────────▼──────────┐            ┌──────────▼──────────┐
│  Integration Svc    │              │   Orchestrator Svc    │            │   Query Svc         │
│  GitHub OAuth       │              │   Job lifecycle       │            │   UI KB search      │
│  Clone / PR export  │              │   Temporal/BullMQ     │            │   GraphQL (read)    │
└──────────┬──────────┘              └───────────┬──────────┘            └──────────┬──────────┘
           │                                       │                                   │
           │              ┌────────────────────────┼────────────────────────┐          │
           │              │                        │                        │          │
           │   ┌──────────▼─────────┐  ┌─────────▼─────────┐  ┌─────────▼─────────┐ │
           │   │  Scan Worker Pool   │  │  AI Worker Pool    │  │ Export Worker     │ │
           │   │  · Repo Scanner     │  │  · Story Agent     │  │ · ZIP builder     │ │
           │   │  · UI Parser        │  │  · Mapping Agent   │  │ · GitHub PR       │ │
           │   │  · Locator Engine   │  │  · Codegen Agent   │  │                   │ │
           │   │  · Embedder         │  │  · Validator Agent │  │                   │ │
           │   └──────────┬─────────┘  └─────────┬─────────┘  └─────────┬─────────┘ │
           │              │                        │                        │          │
           └──────────────┼────────────────────────┼────────────────────────┼──────────┘
                          │                        │                        │
              ┌───────────▼────────────────────────▼────────────────────────▼───────────┐
              │                         DATA PLANE                                       │
              │  PostgreSQL (relational + pgvector)  │  Redis (queue + cache)           │
              │  S3 (repo tarballs, artifacts)       │  Secrets Manager (OAuth tokens)  │
              └───────────────────────────────────────────────────────────────────────────┘
                          │
              ┌───────────▼───────────┐
              │   External Services    │
              │  GitHub API · LLM APIs │
              └───────────────────────┘
```

### Major Components

| Component | Type | Responsibility |
|-----------|------|----------------|
| **Frontend Application** | Next.js 15 SPA/SSR | Dashboard, review UI, job progress, KB explorer |
| **Backend API Layer** | NestJS (Node) or FastAPI (Python) | Auth, CRUD, job enqueue, WebSocket events |
| **Repository Scanner Service** | Worker | Clone repo, detect framework, enqueue parse jobs |
| **Locator Extraction Engine** | Library in scan worker | AST walk, attribute extract, stability score |
| **UI Parser** | Pluggable parser module | React/Next JSX/TSX → component graph |
| **AI Processing Engine** | Worker + agent orchestrator | Story decompose, RAG retrieve, map, codegen |
| **Vector Store** | pgvector (MVP) | Element/page embeddings for semantic retrieval |
| **Test Generation Engine** | Worker library | IR → Handlebars/EJS templates → Playwright TS |
| **Output Formatter** | Export worker | ZIP assembly, GitHub PR creation |
| **Job Queue System** | Redis + BullMQ or Temporal | Durable async pipelines with retries |
| **Storage Layer** | S3 + PostgreSQL | Blobs, metadata, graph, vectors |

### Architecture Flow (Request Paths)

**Path A — Repository scan:**  
`Dashboard → API → Orchestrator → Scan Worker → [Scanner → Parser → Locator Engine → Embedder] → PostgreSQL/S3 → WS notify`

**Path B — Test generation:**  
`Dashboard → API → Orchestrator → AI Worker → [Story Agent → RAG → Mapping Agent → (Review) → Codegen Agent → Validator] → S3 → Export Worker → GitHub/ZIP`

---

## 3. Data Flow Architecture

### 3.1 Repository Ingestion Pipeline

```
Step 1  INPUT
        GitHub repo URL + branch + org_id + commit SHA (optional)

Step 2  CLONE
        Integration Service shallow-clones to ephemeral volume
        → tarball uploaded to S3: s3://{tenant}/{repo_id}/{commit}.tar.gz

Step 3  FRAMEWORK DETECT
        Read package.json, lockfile, config files
        → framework enum: REACT | NEXTJS | UNSUPPORTED

Step 4  FILE INDEX
        Walk src/, app/, pages/, components/
        Skip node_modules, dist, .next, coverage, *.min.js
        → file_manifest[] with content SHA256 per file

Step 5  PARSE (parallel by top-level directory)
        For each .tsx/.jsx/.ts file:
          AST parse → component nodes, JSX elements, imports
        → raw_component_graph (in-memory, streamed to DB)

Step 6  ROUTE GRAPH
        Next.js: app/**/page.tsx, pages/**, route groups
        React Router: scan route config files
        → pages[] with route paths linked to components

Step 7  LOCATOR EXTRACTION
        For each JSX element with interactable tag (input, button, a, select, textarea, form):
          extract attributes, static text, label associations
          compute stability score per candidate
        → ui_elements[] + locator_candidates[]

Step 8  GRAPH PERSIST
        Insert components, pages, elements, edges (parent/child, page→component)
        → PostgreSQL relational tables

Step 9  EMBED
        For each ui_element: build embedding document
        Chunk text: "{page} {component} {role} {label} {testid} {placeholder}"
        → upsert pgvector embedding (1536-dim) keyed by element_id + content_hash

Step 10 INDEX COMPLETE
        Update repository_scan status = COMPLETE
        Emit WebSocket event + optional email
```

### 3.2 Test Generation Pipeline

```
Step 1  INPUT
        user_story { title, description, acceptance_criteria[] }
        repository_id (must have COMPLETE scan)

Step 2  STORY NORMALIZE
        LLM extracts: actors, goals, preconditions, acceptance criteria bullets
        → story_context JSON

Step 3  TEST PLAN DECOMPOSE (Story Agent)
        LLM + JSON schema → test_plan_ir.steps[]
        Each step: action, target_description, expected_outcome

Step 4  RETRIEVE (per step, hybrid RAG)
        4a. Vector: embed target_description → top-20 ui_elements (filtered by repo_id)
        4b. Graph: expand neighbors on same page_route, same form_id
        4c. Keyword: BM25 on testid, aria-label, static_text (PostgreSQL tsvector)
        → merged candidate set top-10

Step 5  MAP (Mapping Agent)
        LLM receives: step + candidates (with source_ref, locators, scores)
        Output: mapped_element_id, chosen locator, confidence, rationale
        Rule engine caps confidence if no testid/role and dynamic JSX detected

Step 6  GATE
        confidence < 0.85 → status = PENDING_REVIEW, block codegen
        User override via API → update mapping, set confidence = 1.0 (human_verified)

Step 7  CODEGEN (Codegen Agent + Templates)
        Approved test_plan_ir → Playwright spec + Page Object files
        Template engine fills slots; LLM only for assertion message refinement (optional)

Step 8  VALIDATE
        ESLint + custom rules: no waitForTimeout, no xpath in spec, PO encapsulation
        TypeScript compile check (tsc --noEmit on generated output)

Step 9  OUTPUT
        Store artifacts in S3: s3://{tenant}/artifacts/{job_id}/
        Export Worker: ZIP or GitHub PR via Integration Service

Step 10 AUDIT
        Persist full lineage: story → plan → mappings → files → export timestamp
```

### 3.3 Data Stores by Stage

| Stage | Primary store | Data shape |
|-------|---------------|------------|
| Clone | S3 | Tarball |
| Parse | Worker memory → PG | Component graph rows |
| Locators | PostgreSQL | Normalized element + candidate rows |
| Embeddings | pgvector | `ui_element_embeddings` |
| Test Plan IR | PostgreSQL JSONB | `generation_jobs.test_plan_ir` |
| Generated code | S3 | `.ts` files |
| Job state | PostgreSQL + Redis | Status, progress, locks |

---

## 4. Core Module Design

### 4.1 Repository Scanner

| Attribute | Detail |
|-----------|--------|
| **Responsibility** | Acquire source code snapshot; detect framework; coordinate parse pipeline |
| **Input** | `{ org_id, repo_id, git_provider, clone_url, branch, commit_sha? }` |
| **Output** | `{ scan_id, framework, file_count, status, s3_snapshot_key }` |
| **Internal logic** | Shallow clone (depth=1) → ignore patterns → framework classifier → shard files into parse tasks → aggregate results → mark scan complete |
| **Dependencies** | GitHub API, S3, Orchestrator, Secrets Manager (token), Parser registry |

**Idempotency:** Same `repo_id + commit_sha` → skip re-parse if `file_manifest` hashes unchanged.

---

### 4.2 UI Parser

| Attribute | Detail |
|-----------|--------|
| **Responsibility** | Transform source files into structured component/JSX AST representations |
| **Input** | `{ file_path, content, framework: REACT \| NEXTJS }` |
| **Output** | `{ components[], jsx_elements[], imports[], exports[] }` |
| **Internal logic** | ts-morph Project per worker → JSX attribute visitor → resolve default export name → trace import graph for cross-file component names |
| **Dependencies** | TypeScript compiler API / Babel parser, framework-specific route plugins |

**Parser plugin interface:**

```typescript
interface FrameworkParser {
  detect(manifest: PackageManifest): boolean;
  parseFile(path: string, content: string): ParseResult;
  extractRoutes(files: ParseResult[]): RouteGraph;
}
```

MVP implements `ReactParser`, `NextJsAppRouterParser`.

---

### 4.3 Locator Extraction Engine

| Attribute | Detail |
|-----------|--------|
| **Responsibility** | Derive ranked, stability-scored locator candidates per interactable element |
| **Input** | `{ jsx_element, component_context, page_route?, parent_form_id? }` |
| **Output** | `{ element_id, tag, locators: LocatorCandidate[], source_ref }` |
| **Internal logic** | Attribute extraction → label `htmlFor` pairing → static text literal detection → stability scoring → dedupe |
| **Dependencies** | UI Parser output, scoring rules config (YAML) |

**Stability scoring (deterministic, no LLM):**

```python
SCORES = {
  "data-testid": 0.98, "data-cy": 0.97, "data-test": 0.96,
  "role+name": 0.91, "label": 0.88, "stable_id": 0.75,
  "placeholder": 0.70, "static_text": 0.65, "css_bem": 0.55,
  "css_generic": 0.30, "xpath": 0.15
}
PENALTIES = {
  "dynamic_expression": -0.25,
  "generated_class_pattern": -0.35,  # css-[a-z0-9]{6,}
  "array_index_selector": -0.40
}
```

---

### 4.4 AI Understanding Engine

| Attribute | Detail |
|-----------|--------|
| **Responsibility** | Orchestrate LLM agents for story understanding, mapping, and optional assertion wording |
| **Input** | `{ user_story, repository_id, scan_id, org_conventions? }` |
| **Output** | `{ test_plan_ir, mappings[], review_items[], model_versions[] }` |
| **Internal logic** | Agent pipeline with structured outputs (JSON Schema validation); retry on schema failure; fallback to smaller model for classification tasks |
| **Dependencies** | RAG System, LLM provider abstraction, PostgreSQL (job state), prompt registry |

**Agents (MVP):**

| Agent | Model tier | Task |
|-------|------------|------|
| Story Agent | Reasoning (GPT-4.1 / Claude Sonnet) | Decompose story → Test Plan IR |
| Mapping Agent | Reasoning | Step + candidates → mapping + rationale |
| Validator Agent | Fast (GPT-4.1-mini) | Lint generated code summary |
| Codegen Assist | Code (optional) | Assertion message polish only |

---

### 4.5 RAG System

| Attribute | Detail |
|-----------|--------|
| **Responsibility** | Retrieve relevant UI elements for each test plan step |
| **Input** | `{ step.target_description, repo_id, page_hints[], action_type }` |
| **Output** | `{ candidates: UiElement[], retrieval_trace }` |
| **Internal logic** | Hybrid fusion: `score = 0.5*vector + 0.3*keyword + 0.2*graph_proximity` → dedupe → top-10 |
| **Dependencies** | pgvector, PostgreSQL tsvector, graph adjacency tables, embedding service |

**Retrieval trace** (stored for audit/debug): which channels contributed each candidate.

---

### 4.6 Test Generator

| Attribute | Detail |
|-----------|--------|
| **Responsibility** | Convert approved Test Plan IR into Playwright TypeScript files |
| **Input** | `{ approved_test_plan_ir, framework: PLAYWRIGHT, language: TYPESCRIPT, export_config }` |
| **Output** | `{ files: [{ path, content }], page_objects[], spec_files[] }` |
| **Internal logic** | Group steps by page → generate PO class per page → generate spec with PO imports → apply org naming conventions |
| **Dependencies** | Template engine (Handlebars), locator-to-Playwright mapper, Validator Agent |

**Locator → Playwright mapping:**

| Strategy | Generated code |
|----------|----------------|
| testid | `page.getByTestId('email-input')` |
| role+name | `page.getByRole('textbox', { name: 'Email' })` |
| label | `page.getByLabel('Email address')` |
| placeholder | `page.getByPlaceholder('Enter email')` |
| css | `page.locator('[data-testid=...]')` — only if higher strategies absent |

---

### 4.7 Code Formatter (Output Formatter)

| Attribute | Detail |
|-----------|--------|
| **Responsibility** | Package artifacts for download or GitHub PR |
| **Input** | `{ job_id, files[], export_type: ZIP \| GITHUB_PR, target_branch, target_path }` |
| **Output** | `{ download_url \| pr_url, checksum }` |
| **Internal logic** | Prettier format TS → assemble folder structure → README from template → ZIP to S3 presigned URL OR GitHub Git Data API commit on branch |
| **Dependencies** | S3, GitHub API, Prettier |

**Default export structure:**

```
tests/
  e2e/
    {feature}/
      {story-slug}.spec.ts
  pages/
    {PageName}.page.ts
  fixtures/
    auth.setup.ts          # P2 if auth detected
README.qa-automater.md
.env.example               # BASE_URL, TEST_USER_EMAIL, etc.
```

---

## 5. AI / LLM Architecture

### 5.1 How LLM Is Used (and Not Used)

| Task | LLM? | Method |
|------|------|--------|
| Framework detection | No | Rule-based on package.json |
| AST parsing | No | ts-morph / Babel |
| Locator extraction | No | Deterministic visitor + scoring |
| Embedding generation | No* | OpenAI embeddings API (*not generative LLM) |
| Story decomposition | **Yes** | Structured JSON output |
| Locator disambiguation | **Yes** | Retrieval-grounded; must pick from candidates |
| Playwright codegen structure | **Mostly No** | Templates; LLM optional for assertions |
| Code validation | Hybrid | ESLint rules + LLM summary |

### 5.2 Prompt Strategy

**Principles:**
1. **Structured outputs only** — JSON Schema / function calling; reject freeform
2. **Retrieval-grounded mapping** — Mapping Agent MUST select `element_id` from provided candidate list
3. **Citation required** — rationale must reference `source_ref`
4. **Versioned prompts** — stored in `prompt_registry` table with hash; linked to job

**Story Agent system prompt (excerpt):**

```
You decompose user stories into executable browser test steps.
Output JSON matching TestPlanSchema. Each step must have:
- action: navigate|fill|click|assert|select|wait
- target_description: specific UI target in plain English
- expected_outcome: observable result

Do NOT invent URLs unless inferable from story. Prefer role-based descriptions.
```

**Mapping Agent system prompt (excerpt):**

```
Given one test step and a numbered list of UI element candidates (from source code analysis),
select the best element_id and locator strategy.

RULES:
- You MUST choose element_id from the candidate list only
- If no candidate fits, set confidence below 0.5 and explain
- Prefer data-testid > role+name > label
- Never invent selectors not in candidate.locators[]
```

### 5.3 RAG Design

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Test Step   │────►│ Query Builder    │────►│ Multi-Channel   │
│ description │     │ + page hints     │     │ Retrieval       │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                       │
                        ┌──────────────────────────────┼──────────────────────────────┐
                        │                              │                              │
               ┌────────▼────────┐           ┌─────────▼─────────┐           ┌────────▼────────┐
               │ Vector Channel  │           │ Keyword Channel   │           │ Graph Channel   │
               │ pgvector cosine │           │ tsvector BM25     │           │ page/form edges │
               │ top-20          │           │ top-20            │           │ 1-hop neighbors │
               └────────┬────────┘           └─────────┬─────────┘           └────────┬────────┘
                        │                              │                              │
                        └──────────────────────────────┼──────────────────────────────┘
                                                       │
                                              ┌────────▼────────┐
                                              │ Reciprocal Rank │
                                              │ Fusion + Filter │
                                              │ (repo_id scope) │
                                              └────────┬────────┘
                                                       │
                                              ┌────────▼────────┐
                                              │ Top-10 to LLM   │
                                              └─────────────────┘
```

**Metadata filters (always applied):** `org_id`, `repository_id`, `scan_id` (latest complete).

### 5.4 Embedding Strategy

| Entity | Embedded text template | Dimensions | Model |
|--------|------------------------|------------|-------|
| UI Element | `{page_route} {component_name} {tag} {role} {aria_label} {testid} {placeholder} {button_text}` | 1536 | text-embedding-3-small |
| Page | `{route} {page_title} {linked_component_names}` | 1536 | same |
| User Story (P3) | Full story text for similarity reuse | 1536 | same |

**Invalidation:** Re-embed only when `content_hash` of source element changes (incremental scan).

### 5.5 Context Retrieval Flow

1. Story Agent may emit `page_hints: ["/login"]` per step  
2. Query builder adds route filter boost (+0.15 score)  
3. Vector search on step `target_description` embedding  
4. Graph expansion: all elements on hinted pages + form siblings  
5. Keyword search for exact testid/label mentions in step text  
6. Fusion → top-10 → Mapping Agent context window (~4K tokens for candidates)

### 5.6 Memory System

| Memory type | MVP | Storage |
|-------------|-----|---------|
| **Session memory** | User review overrides within generation job | `generation_jobs.mapping_overrides` JSONB |
| **Org conventions** | Preferred export path, PO naming | `organizations.settings` JSONB |
| **Episodic (P3)** | Past story → successful mapping pairs | `mapping_history` table + vector index |
| **No conversational chat memory in MVP** | — | — |

---

## 6. Database Design

### 6.1 Entity Relationship Overview

```
organizations ─┬─ users (via org_members)
               ├─ repositories ─┬─ repository_scans
               │                ├─ pages
               │                ├─ components
               │                └─ ui_elements ─┬─ locator_candidates
               │                              └─ ui_element_embeddings
               ├─ user_stories
               └─ generation_jobs ─┬─ test_plan_steps
                                     ├─ locator_mappings
                                     └─ generated_artifacts
```

All tables include `org_id` for row-level tenancy. Application enforces `org_id` from JWT; PostgreSQL RLS enabled as defense-in-depth.

### 6.2 Core Tables (PostgreSQL)

#### `organizations`

```sql
CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(100) UNIQUE NOT NULL,
  plan_tier     VARCHAR(50) DEFAULT 'free',
  settings      JSONB DEFAULT '{}',  -- export_path, confidence_threshold
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

#### `repositories`

```sql
CREATE TABLE repositories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  provider        VARCHAR(20) NOT NULL,  -- github
  external_id     VARCHAR(100) NOT NULL,
  full_name       VARCHAR(255) NOT NULL,  -- acme/web-app
  default_branch  VARCHAR(100) DEFAULT 'main',
  framework       VARCHAR(50),  -- nextjs, react
  github_installation_id BIGINT,
  status          VARCHAR(30) DEFAULT 'connected',
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, provider, external_id)
);
```

#### `repository_scans`

```sql
CREATE TABLE repository_scans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL,
  repository_id   UUID NOT NULL REFERENCES repositories(id),
  commit_sha      VARCHAR(40),
  status          VARCHAR(30) NOT NULL,  -- queued|running|complete|failed
  file_count      INT,
  element_count   INT,
  s3_snapshot_key VARCHAR(512),
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

#### `ui_elements`

```sql
CREATE TABLE ui_elements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL,
  repository_id   UUID NOT NULL,
  scan_id         UUID NOT NULL REFERENCES repository_scans(id),
  page_id         UUID REFERENCES pages(id),
  component_id    UUID REFERENCES components(id),
  element_key     VARCHAR(255) NOT NULL,  -- login.email_input
  tag             VARCHAR(50) NOT NULL,
  source_file     VARCHAR(512) NOT NULL,
  source_line     INT NOT NULL,
  static_text     VARCHAR(500),
  attributes      JSONB DEFAULT '{}',
  content_hash    VARCHAR(64) NOT NULL,
  search_vector   TSVECTOR,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ui_elements_repo ON ui_elements(repository_id, scan_id);
CREATE INDEX idx_ui_elements_search ON ui_elements USING GIN(search_vector);
```

#### `locator_candidates`

```sql
CREATE TABLE locator_candidates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ui_element_id   UUID NOT NULL REFERENCES ui_elements(id) ON DELETE CASCADE,
  strategy        VARCHAR(30) NOT NULL,  -- testid, role, label, css, ...
  value           JSONB NOT NULL,          -- { "name": "email-input" } or { "role":"textbox","name":"Email" }
  stability_score DECIMAL(4,3) NOT NULL,
  rank            SMALLINT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

#### `ui_element_embeddings`

```sql
CREATE TABLE ui_element_embeddings (
  ui_element_id   UUID PRIMARY KEY REFERENCES ui_elements(id) ON DELETE CASCADE,
  embedding       vector(1536) NOT NULL,
  model           VARCHAR(50) NOT NULL,
  content_hash    VARCHAR(64) NOT NULL
);
CREATE INDEX idx_embeddings_vector ON ui_element_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

#### `user_stories`

```sql
CREATE TABLE user_stories (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL,
  repository_id         UUID NOT NULL REFERENCES repositories(id),
  title                 VARCHAR(500) NOT NULL,
  description           TEXT NOT NULL,
  acceptance_criteria   JSONB DEFAULT '[]',
  created_by            UUID NOT NULL,
  created_at            TIMESTAMPTZ DEFAULT now()
);
```

#### `generation_jobs`

```sql
CREATE TABLE generation_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL,
  repository_id     UUID NOT NULL,
  scan_id           UUID NOT NULL,
  user_story_id     UUID REFERENCES user_stories(id),
  status            VARCHAR(30) NOT NULL,  -- planning|mapping|review|codegen|complete|failed
  test_plan_ir      JSONB,
  framework_output  VARCHAR(20) DEFAULT 'playwright',
  confidence_min    DECIMAL(4,3),
  model_versions    JSONB DEFAULT '{}',
  export_type       VARCHAR(20),
  export_url        TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  completed_at      TIMESTAMPTZ
);
```

#### `locator_mappings`

```sql
CREATE TABLE locator_mappings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_job_id UUID NOT NULL REFERENCES generation_jobs(id) ON DELETE CASCADE,
  step_order        INT NOT NULL,
  ui_element_id     UUID REFERENCES ui_elements(id),
  locator_candidate_id UUID REFERENCES locator_candidates(id),
  confidence        DECIMAL(4,3) NOT NULL,
  rationale         TEXT,
  human_verified    BOOLEAN DEFAULT false,
  override_locator  JSONB,
  created_at        TIMESTAMPTZ DEFAULT now()
);
```

#### `generated_artifacts`

```sql
CREATE TABLE generated_artifacts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_job_id UUID NOT NULL REFERENCES generation_jobs(id),
  file_path         VARCHAR(512) NOT NULL,
  s3_key            VARCHAR(512) NOT NULL,
  checksum_sha256   VARCHAR(64) NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);
```

### 6.3 Test Plan IR Schema (JSONB in `generation_jobs.test_plan_ir`)

```json
{
  "version": "1.0",
  "story_id": "uuid",
  "steps": [
    {
      "order": 1,
      "action": "navigate",
      "target_description": "login page",
      "page_hint": "/login",
      "expected_outcome": "Login form is visible",
      "mapping": {
        "element_id": "uuid",
        "locator": { "strategy": "testid", "value": "login-form" },
        "confidence": 0.92,
        "rationale": "Login page route matched app/login/page.tsx",
        "source_ref": "app/login/page.tsx:12"
      }
    }
  ]
}
```

---

## 7. API Architecture

**Base URL:** `https://api.qaautomater.com/v1`  
**Auth:** Bearer JWT (Clerk/Auth0) + org context header `X-Org-Id`  
**Format:** JSON; errors follow RFC 7807 Problem Details

### 7.1 Repository APIs

#### `POST /integrations/github/connect`

Initiate GitHub App/OAuth flow.

**Response 200:**
```json
{ "authorization_url": "https://github.com/login/oauth/..." }
```

#### `POST /repositories`

Register and trigger first scan.

**Request:**
```json
{
  "provider": "github",
  "full_name": "acme/web-app",
  "branch": "main"
}
```

**Response 202:**
```json
{
  "repository_id": "uuid",
  "scan_id": "uuid",
  "status": "queued",
  "poll_url": "/v1/scans/uuid"
}
```

#### `POST /repositories/{id}/scans`

Trigger re-scan (optionally pin commit).

**Request:** `{ "commit_sha": "abc123" }`  
**Response 202:** Same as above.

#### `GET /scans/{scan_id}`

**Response 200:**
```json
{
  "id": "uuid",
  "status": "running",
  "progress": { "phase": "parsing", "files_done": 210, "files_total": 412 },
  "framework": "nextjs",
  "element_count": null,
  "error": null
}
```

---

### 7.2 UI Knowledge Base APIs

#### `GET /repositories/{id}/pages`

**Query:** `?search=login&limit=50&offset=0`

**Response 200:**
```json
{
  "items": [
    { "id": "uuid", "route": "/login", "component_count": 4, "element_count": 12 }
  ],
  "total": 1
}
```

#### `GET /repositories/{id}/elements`

**Query:** `?q=email&page_route=/login&limit=20`

**Response 200:**
```json
{
  "items": [
    {
      "id": "uuid",
      "element_key": "login.email_input",
      "tag": "input",
      "source_ref": "src/auth/LoginForm.tsx:42",
      "locators": [
        { "strategy": "testid", "value": "email-input", "stability_score": 0.98, "rank": 1 }
      ]
    }
  ]
}
```

---

### 7.3 User Story & Generation APIs

#### `POST /repositories/{id}/stories`

**Request:**
```json
{
  "title": "User login",
  "description": "As a user, I want to log in so I can access my dashboard.",
  "acceptance_criteria": ["Dashboard shows welcome message"]
}
```

**Response 201:** `{ "user_story_id": "uuid" }`

#### `POST /repositories/{id}/generate`

**Request:**
```json
{
  "user_story_id": "uuid",
  "output_framework": "playwright",
  "language": "typescript"
}
```

**Response 202:**
```json
{
  "generation_job_id": "uuid",
  "status": "planning",
  "poll_url": "/v1/generation-jobs/uuid"
}
```

#### `GET /generation-jobs/{id}`

**Response 200:**
```json
{
  "id": "uuid",
  "status": "review",
  "test_plan_ir": { "steps": [ "..."] },
  "review_items": [
    {
      "step_order": 5,
      "confidence": 0.72,
      "candidates": [ "..." ],
      "rationale": "Dashboard heading not uniquely identified in static analysis"
    }
  ],
  "confidence_min": 0.72
}
```

#### `PATCH /generation-jobs/{id}/mappings/{step_order}`

Human override.

**Request:**
```json
{
  "ui_element_id": "uuid",
  "locator_candidate_id": "uuid",
  "human_verified": true
}
```

#### `POST /generation-jobs/{id}/export`

**Request:**
```json
{
  "type": "zip" | "github_pr",
  "target_branch": "qa/add-login-test",
  "target_path": "tests/e2e"
}
```

**Response 200:**
```json
{
  "export_url": "https://...presigned...",
  "pr_url": "https://github.com/acme/web-app/pull/847"
}
```

---

### 7.4 WebSocket Events

**Channel:** `wss://api.qaautomater.com/v1/ws?token=...`

| Event | Payload |
|-------|---------|
| `scan.progress` | `{ scan_id, phase, percent }` |
| `scan.complete` | `{ scan_id, element_count }` |
| `generation.status` | `{ job_id, status }` |
| `generation.review_required` | `{ job_id, review_count }` |

---

## 8. Technology Stack Recommendation

| Layer | Choice | Justification |
|-------|--------|---------------|
| **Frontend** | Next.js 15 + TypeScript + Tailwind + shadcn/ui | Same ecosystem as target repos; fast dashboard iteration; SSR for marketing |
| **Backend API** | **NestJS (Node 20)** | Strong typing shared with frontend; ts-morph native for parser workers; good WebSocket support |
| **Scan/Parser workers** | Node worker threads OR separate Node containers | CPU-bound AST; isolate crashes from API |
| **AI workers** | Python 3.12 (FastAPI sidecar) OR Node with LLM SDK | Python if team prefers LangGraph; Node if unified stack prioritized — **recommend Node + LangChain.js for MVP unity** |
| **LLM** | OpenAI GPT-4.1 + GPT-4.1-mini; fallback Anthropic Claude Sonnet | Structured output quality; provider abstraction for failover |
| **Embeddings** | OpenAI text-embedding-3-small | Cost-effective; 1536 dims match pgvector well |
| **Vector DB** | **pgvector in PostgreSQL** | Single DB ops; sufficient to ~5M vectors; migrate to Qdrant at 10M+ |
| **Primary DB** | PostgreSQL 16 | JSONB for IR, tsvector for keyword, RLS for tenancy |
| **Queue** | **Redis 7 + BullMQ** | Simple MVP; upgrade to Temporal when workflow complexity grows (self-healing, multi-step sagas) |
| **Object storage** | AWS S3 or Cloudflare R2 | Repo snapshots, artifact storage, presigned downloads |
| **Secrets** | AWS Secrets Manager / Doppler | OAuth tokens, LLM keys |
| **Auth** | Clerk | Fast SaaS auth; orgs; GitHub social; SSO path in P3 |
| **Automation output** | Playwright 1.4x + TypeScript 5.x | PRD MVP target; Cypress Handlebars templates in P2 |
| **IaC** | Terraform + AWS ECS Fargate | Boring, well-understood; EKS when >20 services |
| **Observability** | OpenTelemetry → Grafana Cloud (or Datadog) | Traces across API → worker → LLM |

**Trade-off note:** NestJS + ts-morph keeps parser and API in one language. If parser complexity explodes (Vue SFC, Angular templates), extract **Parser Service** as isolated Node microservice without changing data contracts.

---

## 9. Scalability Design

### 9.1 Multiple Repositories

- **Tenant quota enforcement** in API middleware (`plan_tier → max_repos, max_scans/day`)  
- **Scan scheduling:** fair-queue across tenants (prevent one org monopolizing workers)  
- **Data partition:** all queries scoped by `org_id`; consider schema-per-tenant only at 1000+ enterprise scale  

### 9.2 Large Codebases (10K+ files)

| Strategy | Implementation |
|----------|----------------|
| **Incremental scan** | Git diff → re-parse only changed files (P2) |
| **Parallel parse** | Shard by directory; BullMQ child jobs; aggregate in `scan_coordinator` |
| **File caps** | Skip files >500KB; skip non-source extensions |
| **Streaming persist** | Batch insert elements 500 rows at a time |
| **Embedding batch** | OpenAI embed API batch size 100; rate limit aware |

### 9.3 Parallel Processing

```
Scan Job (parent)
  ├── parse_shard_1 (app/)
  ├── parse_shard_2 (src/components/)
  ├── parse_shard_3 (src/features/)
  └── embed_batch_* (after parse complete)

Generation Job (sequential AI, parallel retrieval)
  ├── retrieve_step_1..N  (can parallelize embedding queries)
  ├── map_step_1..N       (LLM batched 3 steps/call if same page)
  └── codegen               (single-threaded template render)
```

**Worker autoscaling:** ECS/Fargate on queue depth metrics (`bull:scan:waiting`, `bull:ai:waiting`).

### 9.4 Caching Strategy

| Cache | Key | TTL | Invalidation |
|-------|-----|-----|--------------|
| Framework detection | `repo:{id}:framework` | 24h | New scan |
| UI KB search | `org:{id}:search:{hash}` | 5 min | Scan complete |
| Embeddings | `element:{content_hash}` | Permanent | Content hash change |
| LLM story decompose | `story:{hash}:plan` | 7d | User edits story |
| Presigned ZIP URL | — | 15 min | One-time download |

Redis for hot caches; PostgreSQL `content_hash` for embedding dedupe.

---

## 10. Security Architecture

### 10.1 Repository Access

- **GitHub GitHub App** (preferred over OAuth PAT) — fine-grained repo permissions, short-lived installation tokens  
- Tokens stored in Secrets Manager; never in PostgreSQL plaintext  
- Clone operations in **ephemeral containers** with no outbound network except GitHub + S3  
- **No arbitrary code execution** during parse — AST parsers only, no `npm install` in customer repo for MVP  

### 10.2 API Authentication

```
Client → Clerk JWT → API Gateway validates → extract user_id, org_ids
       → RBAC middleware (Admin | Member)
       → Resource handler verifies resource.org_id ∈ user.org_ids
```

Rate limits: 100 req/min/user; 10 generation jobs/hour on free tier.

### 10.3 Data Isolation

- **Logical isolation:** `org_id` on every row; enforced in repository layer  
- **PostgreSQL RLS:** `USING (org_id = current_setting('app.org_id')::uuid)`  
- **S3 prefix:** `s3://bucket/{org_id}/{repo_id}/...`  
- **Deletion:** `DELETE repository` cascades scans, elements, jobs; S3 lifecycle purge within 24h  

### 10.4 Secrets Management

| Secret | Storage | Rotation |
|--------|---------|----------|
| GitHub installation tokens | Secrets Manager | Auto-refresh per job |
| LLM API keys | Secrets Manager | Quarterly |
| DB credentials | RDS IAM auth / Secrets Manager | Automatic |
| JWT signing | Clerk managed | N/A |

### 10.5 LLM Data Handling

- Enterprise API tier with **no training** on customer data  
- Prompt logs redact story text in production after 30 days (configurable)  
- Source code snippets in mapping prompts limited to **candidate metadata only** (not full files)  

---

## 11. Deployment Architecture

### 11.1 Cloud Strategy (AWS MVP)

```
Region: us-east-1 (primary)

┌─────────────────────────────────────────────────────────────┐
│                        VPC                                   │
│  Public subnets: ALB, NAT Gateway                           │
│  Private subnets: ECS services, RDS, ElastiCache               │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ ECS: web    │  │ ECS: api    │  │ ECS: workers (scan, │  │
│  │ (Next.js)   │  │ (NestJS)    │  │  ai, export)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                              │
│  RDS PostgreSQL 16 (Multi-AZ)    ElastiCache Redis 7          │
└─────────────────────────────────────────────────────────────┘
         │                                    │
    CloudFront CDN                      S3 (artifacts)
```

### 11.2 Containerization

| Service | Image | CPU/Mem (MVP) |
|---------|-------|---------------|
| `qa-web` | Next.js standalone | 0.5 vCPU / 1GB |
| `qa-api` | NestJS | 1 vCPU / 2GB |
| `qa-worker-scan` | Node + ts-morph | 2 vCPU / 4GB |
| `qa-worker-ai` | Node + LLM SDK | 1 vCPU / 2GB |
| `qa-worker-export` | Node + git CLI | 0.5 vCPU / 1GB |

Docker multi-stage builds; non-root user; distroless runtime for workers.

### 11.3 CI/CD Flow

```
PR → GitHub Actions
  ├── lint + typecheck (web, api)
  ├── unit tests (parser golden files, scoring engine)
  ├── integration tests (Testcontainers PostgreSQL + Redis)
  ├── AI eval harness (20 golden stories — threshold gate)
  └── docker build → push ECR

main merge → deploy staging (ECS blue/green)
manual promote → production

Database migrations: Flyway/Prisma migrate in deploy pipeline
```

### 11.4 Monitoring & Logging

| Signal | Tool |
|--------|------|
| Metrics | Prometheus → Grafana (queue depth, scan duration, LLM latency, mapping confidence histogram) |
| Logs | Structured JSON → CloudWatch Logs / Loki |
| Traces | OpenTelemetry: API → BullMQ → worker → OpenAI |
| Alerts | PagerDuty: scan failure rate >5%, API p95 >2s, LLM error rate >2% |
| Product analytics | PostHog (funnel: connect → scan → generate → export) |

---

## 12. Potential Bottlenecks

### 12.1 AI Limitations

| Bottleneck | Impact | Mitigation |
|------------|--------|------------|
| Mapping hallucination | Wrong selectors in tests | Candidate-only constraint; confidence gate; human review |
| Story ambiguity | Incomplete test plans | Require acceptance criteria; prompt for clarification UI (P2) |
| Context window limits | Large candidate lists truncated | Top-10 fusion; summarize candidates to compact JSON |
| Model latency | Slow generation UX | Parallel retrieval; stream progress via WS; cache story plans |
| Cost at scale | Margin erosion | Template codegen; mini model for classify; embedding cache |

### 12.2 Parsing Complexity

| Bottleneck | Impact | Mitigation |
|------------|--------|------------|
| Dynamic JSX | Missing static text | Flag low confidence; prefer testid |
| Re-exports / barrel files | Broken component graph | Resolve import graph with depth limit |
| Next.js server components | Client vs server boundary | MVP: parse client components only; mark server files |
| Monorepos | Wrong app indexed | P2 app-root selector |
| Parse crashes on syntax errors | Scan failure | Per-file error isolation; continue scan |

### 12.3 Large Repository Handling

| Bottleneck | Impact | Mitigation |
|------------|--------|------------|
| 50K+ files | Timeout | Hard cap + user warning; incremental scan |
| Memory pressure | Worker OOM | Stream AST; don't load full repo in memory |
| Embedding cost | $$$ on first scan | content_hash dedupe; batch embed |
| Vector index build time | Slow search post-scan | IVFFlat → HNSW at scale; build index async |

### 12.4 LLM Call Cost (Estimates)

| Operation | Calls per story | Tokens (est.) | Cost @ $3/1M in |
|-----------|-----------------|---------------|-----------------|
| Story decompose | 1 | 2K in / 1K out | ~$0.01 |
| Mapping (5 steps) | 1–2 batched | 8K in / 2K out | ~$0.04 |
| Codegen assist | 0–1 | 4K | ~$0.02 |
| **Total per story** | | | **~$0.07** |

At 300 stories/mo/team → ~$21/mo LLM cost (healthy margin on $499 plan).

---

## 13. Future Extensions

### 13.1 Self-Healing Locators (Phase 3)

```
Test execution failure → capture DOM snapshot + trace
  → diff against ui_element source_ref
  → Retrieval on updated scan
  → Mapping Agent suggests new locator
  → Auto-PR or human approve
```

**Requires:** Execution worker pool, DOM snapshot store, diff engine, link `generated_artifacts` → `ui_elements`.

### 13.2 Vision-Based UI Detection (Phase 3+)

- Playwright screenshot at step failure  
- Multimodal LLM (GPT-4o / Claude vision) for element identification when static analysis fails  
- Use only as **fallback channel** in RAG fusion (expensive)  

### 13.3 Auto Test Maintenance (Phase 3)

- GitHub webhook on push → incremental scan  
- Compare `content_hash` of affected `ui_elements` to `locator_mappings` in open jobs  
- Flag stale tests; open "maintenance job" with suggested diff  

### 13.4 CI/CD Integration (Phase 2–3)

- GitHub Action: `qa-automater/verify-locators@v1`  
- PR comment: locator readiness score delta  
- Export includes `playwright.config.ts` snippet + GitHub Actions workflow template  

### 13.5 Real-Time Test Execution (Phase 3)

```
ECS/Fargate browser grid (Playwright)
  → run generated spec against customer staging URL (allowlisted)
  → store trace.zip in S3
  → feed Validator + Self-healing pipeline
```

**Isolation:** Dedicated VPC per enterprise; customer staging URL allowlist; no production URL execution by default.

---

## Appendix A: MVP Service Boundaries (Build Order)

| Sprint block | Services to implement |
|--------------|----------------------|
| **S1** | API skeleton, auth, org, GitHub connect, S3 |
| **S2** | Scan worker, React/Next parser, locator engine, PG schema |
| **S3** | Embedding pipeline, UI KB query APIs, dashboard explorer |
| **S4** | AI workers, RAG, story → plan → map, review API |
| **S5** | Codegen templates, validator, ZIP export |
| **S6** | GitHub PR export, WebSocket progress, eval harness |

## Appendix B: Architecture Decision Records (Summary)

| ADR | Decision | Rationale |
|-----|----------|-----------|
| ADR-001 | IR-gated pipeline (no direct story→code) | Trust + debuggability |
| ADR-002 | pgvector over dedicated vector DB for MVP | Ops simplicity |
| ADR-003 | NestJS monorepo with worker containers | Shared types with parser |
| ADR-004 | Template-first codegen | Deterministic output; lower LLM cost |
| ADR-005 | Confidence gate at 0.85 default | PRD SM-C2 compliance |
| ADR-006 | GitHub App over PAT | Security least-privilege |

## Appendix C: Related Documents

| Document | Path |
|----------|------|
| PRD v2.0 | `../prds/prd-QA-Automater-2026-06-21/prd.md` |
| PRD Addendum | `../prds/prd-QA-Automater-2026-06-21/addendum.md` |
| Next: Epics & Stories | `bmad-create-epics-and-stories` |
| Next: UX Spec | `bmad-ux` |

---

*End of System Architecture v1.0*
