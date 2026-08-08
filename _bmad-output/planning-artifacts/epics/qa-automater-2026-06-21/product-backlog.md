---
title: QA Automater — Product Backlog
created: 2026-07-05
updated: 2026-07-05
status: final
version: 1.0
source_prd: ../../prds/prd-QA-Automater-2026-06-21/prd.md
source_architecture: ../../architecture/qa-automater-2026-06-21/system-architecture.md
scope: MVP (Phase 1) — implementation-ready
---

# QA Automater — Product Backlog

**Product:** QA Automater  
**Scope:** MVP (Phase 1) — 90–120 days  
**Sources:** PRD v2.0 · System Architecture v1.0  
**Total Epics:** 14 (MVP) + 6 (Future — epic-level only)  
**Total User Stories:** 52 (MVP)

---

## Executive Summary

This backlog decomposes the QA Automater MVP into **14 epics** and **52 user stories**, aligned to the NestJS + Next.js + PostgreSQL/pgvector + BullMQ architecture. Stories cover 100% of MVP PRD features (Modules A–E, SYS/AI requirements, NFRs) and map to architecture components (API, Scan Worker, AI Worker, Export Worker, Dashboard).

**Implementation sequence:** Foundation → Auth/Org → GitHub/Scan → Parser/Locators → UI KB → AI Pipeline → Review → Codegen → Export → Dashboard/Ops.

**Total estimated story points (MVP):** ~310 points (~6 sprints at team velocity 50–55 pts/sprint).

**North star validated by:** Epic E8–E11 (story → mapped locators → reviewed → exported Playwright).

---

## Standard Definition of Done (All Stories)

Unless a story specifies additional DoD items:

- [ ] Code merged to `main` with passing CI (lint, typecheck, unit tests)
- [ ] Integration tests cover happy path + primary failure path
- [ ] API changes documented in OpenAPI spec
- [ ] RBAC and `org_id` tenancy enforced on new endpoints
- [ ] No secrets in code; env vars documented
- [ ] QA sign-off on acceptance criteria
- [ ] Feature flags removed or defaulted for MVP release

---

# PART 1 — PRODUCT EPICS (MVP)

---

## Epic E1: Platform Foundation & Core Infrastructure

| Field | Value |
|-------|-------|
| **Epic ID** | E1 |
| **Priority** | Critical |
| **Business Goal** | Establish deployable, scalable SaaS foundation |
| **Description** | Monorepo, CI/CD, PostgreSQL, Redis, S3, ECS, observability baseline |
| **Business Value** | Enables all subsequent development; reduces ops risk |
| **Dependencies** | None |
| **Assumptions** | AWS ECS Fargate; Terraform IaC |
| **Risks** | Over-engineering infra before product validation |
| **Success Metrics** | Staging deploy <15 min; API health check 200; DB migrations automated |

**Architecture alignment:** Data plane, Deployment Architecture §11

---

## Epic E2: Authentication, Organizations & RBAC

| Field | Value |
|-------|-------|
| **Epic ID** | E2 |
| **Priority** | Critical |
| **Business Goal** | Secure multi-tenant access with Admin/Member roles |
| **Description** | Clerk auth, org creation, invites, RBAC middleware, RLS |
| **Business Value** | SaaS monetization prerequisite; tenant isolation |
| **Dependencies** | E1 |
| **Assumptions** | Clerk for MVP auth |
| **Risks** | Cross-tenant data leakage |
| **Success Metrics** | Zero cross-tenant access in security test suite |

**Architecture alignment:** Security §10, API Auth flow

**PRD mapping:** A1, SYS-1, FR-11 (org workspace)

---

## Epic E3: GitHub Integration & Repository Management

| Field | Value |
|-------|-------|
| **Epic ID** | E3 |
| **Priority** | Critical |
| **Business Goal** | Connect customer repos securely |
| **Description** | GitHub App OAuth, repo registration, token management, clone orchestration |
| **Business Value** | Core ingestion entry point — no repo, no product |
| **Dependencies** | E1, E2 |
| **Assumptions** | GitHub App (not PAT) per ADR-006 |
| **Risks** | Token expiry; insufficient repo permissions |
| **Success Metrics** | ≥95% successful connect on golden test org |

**Architecture alignment:** Integration Service, Repository Scanner input

**PRD mapping:** A2, US-1, FR-1

---

## Epic E4: Repository Scanner & Job Orchestration

| Field | Value |
|-------|-------|
| **Epic ID** | E4 |
| **Priority** | Critical |
| **Business Goal** | Async, reliable repo scan pipeline |
| **Description** | BullMQ queues, scan worker, progress tracking, WebSocket events, idempotent scans |
| **Business Value** | Handles long-running analysis without blocking UX |
| **Dependencies** | E1, E3 |
| **Assumptions** | 2 concurrent scans/tenant (MVP) |
| **Risks** | Queue backlog; worker crashes mid-scan |
| **Success Metrics** | Scan median <5 min for 500 files; 3x retry on transient failure |

**Architecture alignment:** Orchestrator, Scan Worker Pool, Job Queue

**PRD mapping:** SYS-2, SYS-4, B1 (partial)

---

## Epic E5: UI Parser & Framework Detection

| Field | Value |
|-------|-------|
| **Epic ID** | E5 |
| **Priority** | Critical |
| **Business Goal** | Parse React/Next.js source into structured AST graph |
| **Description** | Framework detector, ReactParser, NextJsAppRouterParser, route graph |
| **Business Value** | Core differentiator — source-native understanding |
| **Dependencies** | E4 |
| **Assumptions** | ts-morph for JSX/TSX |
| **Risks** | Parser failures on edge-case syntax |
| **Success Metrics** | ≥95% framework detection accuracy on golden set (AI-1) |

**Architecture alignment:** UI Parser §4.2, FrameworkParser interface

**PRD mapping:** B1, B2, B3, AI-1

---

## Epic E6: Locator Extraction Engine

| Field | Value |
|-------|-------|
| **Epic ID** | E6 |
| **Priority** | Critical |
| **Business Goal** | Extract ranked, stability-scored locators with source traceability |
| **Description** | Attribute visitor, label association, stability scoring, component hierarchy |
| **Business Value** | Ground truth for AI mapping; traceability moat |
| **Dependencies** | E5 |
| **Assumptions** | Scoring rules in YAML config |
| **Risks** | Dynamic JSX lowers confidence |
| **Success Metrics** | ≥90% recall on elements with testid (AI-2); ≥80% precision golden audit (SM-1) |

**Architecture alignment:** Locator Extraction Engine §4.3

**PRD mapping:** B5, B6, C1, C2, C3

---

## Epic E7: UI Knowledge Base, Embeddings & Search

| Field | Value |
|-------|-------|
| **Epic ID** | E7 |
| **Priority** | Critical |
| **Business Goal** | Queryable catalog of pages, components, elements |
| **Description** | PostgreSQL schema, pgvector embeddings, hybrid search APIs, dashboard explorer |
| **Business Value** | User trust validation before test generation |
| **Dependencies** | E6 |
| **Assumptions** | text-embedding-3-small; content_hash dedupe |
| **Risks** | Search latency on large repos |
| **Success Metrics** | Search p95 <2s for 5K elements |

**Architecture alignment:** RAG vector channel, UI KB APIs §7.2

**PRD mapping:** B4, US-2, FR-3, FR-4

---

## Epic E8: User Story Management

| Field | Value |
|-------|-------|
| **Epic ID** | E8 |
| **Priority** | High |
| **Business Goal** | Capture requirements as generatable inputs |
| **Description** | Story CRUD APIs, validation, linkage to repository |
| **Business Value** | Requirement traceability start point |
| **Dependencies** | E2, E3 |
| **Assumptions** | Plain text only (no Jira in MVP) |
| **Risks** | Ambiguous stories produce poor test plans |
| **Success Metrics** | Story → generation job linkage 100% |

**Architecture alignment:** user_stories table, POST /repositories/{id}/stories

**PRD mapping:** D1, US-3 (input portion), FR-5

---

## Epic E9: AI Test Planning & RAG Locator Mapping

| Field | Value |
|-------|-------|
| **Epic ID** | E9 |
| **Priority** | Critical |
| **Business Goal** | Convert stories to Test Plan IR with grounded locator mappings |
| **Description** | Story Agent, hybrid RAG, Mapping Agent, confidence scoring, prompt registry |
| **Business Value** | Core AI value proposition |
| **Dependencies** | E7, E8 |
| **Assumptions** | GPT-4.1 + JSON Schema; confidence threshold 0.85 |
| **Risks** | LLM hallucination; latency; cost |
| **Success Metrics** | Story → Test Plan p95 <60s; mapping precision ≥80% |

**Architecture alignment:** AI Understanding Engine §4.4, RAG §4.5, Test Generation Pipeline steps 2–5

**PRD mapping:** D2, D3, D4, AI-3, AI-4, AI-5, AI-10

---

## Epic E10: Review Queue & Human-in-the-Loop

| Field | Value |
|-------|-------|
| **Epic ID** | E10 |
| **Priority** | Critical |
| **Business Goal** | Gate export until mappings are trusted |
| **Description** | Review UI/API, override mappings, confidence gating, export block |
| **Business Value** | Prevents flaky tests; builds user trust |
| **Dependencies** | E9 |
| **Assumptions** | Auto-export blocked below 0.85 |
| **Risks** | Review friction slows UX |
| **Success Metrics** | SM-C2: 0% auto-export below threshold |

**Architecture alignment:** Confidence gate step 6, PATCH mappings API

**PRD mapping:** D5, AI-6, US-4, FR-7, FR-8

---

## Epic E11: Playwright Test Generation & Validation

| Field | Value |
|-------|-------|
| **Epic ID** | E11 |
| **Priority** | Critical |
| **Business Goal** | Produce compilable Playwright TS + Page Objects |
| **Description** | Handlebars templates, locator→Playwright mapper, ESLint validator, tsc check |
| **Business Value** | Deliverable customers merge into CI |
| **Dependencies** | E10 |
| **Assumptions** | Template-first codegen (ADR-004) |
| **Risks** | Invalid generated TypeScript |
| **Success Metrics** | ≥95% compile rate (SM-2); no waitForTimeout in output |

**Architecture alignment:** Test Generator §4.6, Validator Agent

**PRD mapping:** E1, E2, AI-7, AI-8, FR-9

---

## Epic E12: Export & Artifact Delivery

| Field | Value |
|-------|-------|
| **Epic ID** | E12 |
| **Priority** | Critical |
| **Business Goal** | Deliver tests to customer repo/workflow |
| **Description** | ZIP export (S3 presigned), GitHub PR export, README, audit log |
| **Business Value** | Closes the loop — tests in customer ownership |
| **Dependencies** | E11, E3 |
| **Assumptions** | Default path `tests/e2e/` |
| **Risks** | GitHub API rate limits; PR conflicts |
| **Success Metrics** | Story → exportable artifact ≤10 min median (SM-3) |

**Architecture alignment:** Output Formatter §4.7, Export Worker

**PRD mapping:** E3, US-5, FR-10, SYS-6

---

## Epic E13: Dashboard & Real-Time UX

| Field | Value |
|-------|-------|
| **Epic ID** | E13 |
| **Priority** | High |
| **Business Goal** | End-to-end user flows in web dashboard |
| **Description** | Next.js app: onboarding, repo connect, scan progress, KB explorer, generate, review, export |
| **Business Value** | Activation funnel (SM-4, SM-5) |
| **Dependencies** | E2–E12 (incremental UI per epic) |
| **Assumptions** | WCAG 2.1 AA target for core flows |
| **Risks** | Dashboard page load >2s |
| **Success Metrics** | ≥60% beta complete UJ-1; ≥40% complete UJ-2 |

**Architecture alignment:** Frontend Application, WebSocket events §7.4

**PRD mapping:** User Flow §10, NFR Performance (dashboard)

---

## Epic E14: Security, Observability & Operations

| Field | Value |
|-------|-------|
| **Epic ID** | E14 |
| **Priority** | High |
| **Business Goal** | Production-ready security and ops |
| **Description** | Rate limiting, audit logs, OpenTelemetry, alerts, encryption, eval harness |
| **Business Value** | Enterprise trust; quality regression prevention |
| **Dependencies** | E1 (parallel throughout) |
| **Assumptions** | 20 golden stories, 5 repos for eval harness |
| **Risks** | Eval harness not blocking bad releases |
| **Success Metrics** | 99.5% uptime target; eval gate on prompt changes |

**Architecture alignment:** Security §10, Monitoring §11.4, AI-9

**PRD mapping:** SYS-5, SYS-6, SYS-7, AI-9, NFR Security/Reliability

---

# PART 2 — USER STORIES BY EPIC

---

## E1: Platform Foundation & Core Infrastructure

### E1.1 — Initialize Monorepo and CI Pipeline

**User Story:** As a **Developer**, I want a standardized monorepo with CI, so that all teams ship with consistent quality gates.

**Description:** Create `apps/web`, `apps/api`, `packages/shared`, `workers/scan`, `workers/ai`, `workers/export`. GitHub Actions: lint, typecheck, test, Docker build.

**Business Value:** Foundation for parallel team development.

**Acceptance Criteria:**
- **Given** a PR is opened **When** CI runs **Then** lint, typecheck, and unit tests execute and block merge on failure
- **Given** merge to main **When** deploy workflow runs **Then** Docker images push to ECR

**Priority:** Critical | **Points:** 5  
**Dependencies:** None  
**Edge Cases:** CI timeout on large test suites — parallelize jobs  
**Error Handling:** Failed deploy rolls back to previous ECS task definition  
**Notes:** Use Turborepo or Nx; Node 20 LTS

---

### E1.2 — Provision PostgreSQL with pgvector Extension

**User Story:** As a **DevOps Engineer**, I want PostgreSQL 16 with pgvector, so that relational and vector data coexist.

**Description:** RDS Multi-AZ, pgvector enabled, migration tooling (Prisma/Flyway), connection pooling (PgBouncer).

**Acceptance Criteria:**
- **Given** staging environment **When** migration runs **Then** pgvector extension exists
- **Given** api service **When** connecting **Then** pooled connections ≤ max_connections budget

**Priority:** Critical | **Points:** 5  
**Dependencies:** E1.1  
**Notes:** Enable RLS policies scaffold (activated in E2)

---

### E1.3 — Provision Redis and S3 Storage

**User Story:** As a **DevOps Engineer**, I want Redis and S3, so that job queues and artifacts have durable storage.

**Acceptance Criteria:**
- **Given** ElastiCache Redis **When** api enqueues job **Then** job appears in BullMQ queue
- **Given** artifact upload **When** stored **Then** S3 key follows `{org_id}/{repo_id}/` prefix

**Priority:** Critical | **Points:** 3  
**Dependencies:** E1.1

---

### E1.4 — Deploy ECS Services (API, Workers, Web)

**User Story:** As a **DevOps Engineer**, I want containerized services on ECS Fargate, so that the platform scales horizontally.

**Acceptance Criteria:**
- **Given** staging deploy **When** health checks run **Then** `/health` returns 200 for api and web
- **Given** increased queue depth **When** autoscaling triggers **Then** worker task count increases

**Priority:** Critical | **Points:** 8  
**Dependencies:** E1.1, E1.2, E1.3

---

### E1.5 — OpenTelemetry Baseline

**User Story:** As an **SRE**, I want distributed tracing, so that I can debug cross-service failures.

**Acceptance Criteria:**
- **Given** API request enqueues scan **When** worker processes **Then** single trace spans api → queue → worker
- **Given** Grafana **When** viewing dashboard **Then** scan duration and queue depth metrics visible

**Priority:** High | **Points:** 5  
**Dependencies:** E1.4

---

## E2: Authentication, Organizations & RBAC

### E2.1 — Integrate Clerk Authentication

**User Story:** As a **User**, I want to sign up and log in securely, so that I can access the platform.

**Acceptance Criteria:**
- **Given** unauthenticated user **When** accessing dashboard **Then** redirect to Clerk login
- **Given** valid JWT **When** calling API **Then** user_id extracted and validated

**Priority:** Critical | **Points:** 5  
**Dependencies:** E1.1  
**Notes:** Clerk webhook for user sync to local `users` table

---

### E2.2 — Create and Manage Organizations

**User Story:** As a **User**, I want to create an Organization, so that my team has an isolated workspace.

**Acceptance Criteria:**
- **Given** authenticated user **When** creating org with name **Then** org record created and user assigned Admin role
- **Given** org slug **When** duplicate attempted **Then** return 409 Conflict

**Priority:** Critical | **Points:** 3  
**Dependencies:** E2.1

---

### E2.3 — Implement RBAC Middleware (Admin / Member)

**User Story:** As a **Workspace Admin**, I want role-based permissions, so that only admins connect repos.

**Acceptance Criteria:**
- **Given** Member role **When** POST /repositories **Then** return 403 Forbidden
- **Given** Admin role **When** POST /repositories **Then** request proceeds

**Priority:** Critical | **Points:** 5  
**Dependencies:** E2.2

---

### E2.4 — Enable PostgreSQL Row-Level Security

**User Story:** As a **Security Engineer**, I want RLS on tenant tables, so that defense-in-depth prevents data leakage.

**Acceptance Criteria:**
- **Given** RLS policy on repositories **When** query without org context **Then** zero rows returned
- **Given** valid org_id session var **When** query **Then** only org rows returned

**Priority:** High | **Points:** 5  
**Dependencies:** E1.2, E2.2

---

### E2.5 — Invite Team Members by Email

**User Story:** As a **Workspace Admin**, I want to invite QA engineers, so that my team collaborates on test generation.

**Acceptance Criteria:**
- **Given** Admin sends invite **When** invitee accepts **Then** Member role assigned to org
- **Given** Member **When** generating tests **Then** allowed; connecting repos denied

**Priority:** High | **Points:** 5  
**Dependencies:** E2.3  
**PRD:** US-6

---

## E3: GitHub Integration & Repository Management

### E3.1 — Register GitHub App and OAuth Flow

**User Story:** As a **Workspace Admin**, I want to connect GitHub via OAuth, so that the platform can read my repositories.

**Acceptance Criteria:**
- **Given** Admin clicks Connect GitHub **When** OAuth completes **Then** installation token stored in Secrets Manager (not DB plaintext)
- **Given** expired token **When** scan attempted **Then** prompt re-auth with clear message

**Priority:** Critical | **Points:** 8  
**Dependencies:** E2.3, E1.3  
**Architecture:** POST /integrations/github/connect

---

### E3.2 — Register Repository and Trigger Initial Scan

**User Story:** As a **Workspace Admin**, I want to select a repo and branch, so that analysis begins automatically.

**Acceptance Criteria:**
- **Given** connected GitHub **When** POST /repositories with full_name and branch **Then** 202 returned with repository_id and scan_id
- **Given** duplicate repo for org **When** registering **Then** return existing or 409 per product rule

**Priority:** Critical | **Points:** 5  
**Dependencies:** E3.1, E4.1  
**PRD:** US-1, FR-1

---

### E3.3 — List Accessible GitHub Repositories

**User Story:** As a **Workspace Admin**, I want to browse my GitHub repos in the UI, so that I can select one to connect.

**Acceptance Criteria:**
- **Given** valid GitHub token **When** listing repos **Then** return paginated list with full_name, default_branch
- **Given** token lacks repo scope **When** listing **Then** return 403 with remediation steps

**Priority:** High | **Points:** 3  
**Dependencies:** E3.1

---

### E3.4 — Disconnect Repository and Purge Data

**User Story:** As a **Workspace Admin**, I want to disconnect a repo, so that my source code is removed from the platform.

**Acceptance Criteria:**
- **Given** Admin disconnects repo **When** confirmed **Then** cascade delete scans, elements, jobs; S3 purge scheduled within 24h
- **Given** disconnect **When** complete **Then** GitHub token for that repo revoked if applicable

**Priority:** Medium | **Points:** 5  
**Dependencies:** E3.2  
**NFR:** Security — deletion on disconnect

---

## E4: Repository Scanner & Job Orchestration

### E4.1 — Implement BullMQ Scan Job Queue

**User Story:** As the **Platform**, I want scan jobs in a durable queue, so that long analyses don't block API requests.

**Acceptance Criteria:**
- **Given** scan request **When** enqueued **Then** job status QUEUED within 30 seconds
- **Given** worker crash mid-job **When** retry policy applies **Then** job retried up to 3 times with backoff

**Priority:** Critical | **Points:** 5  
**Dependencies:** E1.3  
**PRD:** SYS-2

---

### E4.2 — Clone Repository to Ephemeral Storage

**User Story:** As the **Scan Worker**, I want to shallow-clone repos, so that source is available for parsing.

**Acceptance Criteria:**
- **Given** valid token **When** clone runs **Then** depth=1 shallow clone succeeds
- **Given** clone complete **When** tarball created **Then** uploaded to S3 at `{org_id}/{repo_id}/{commit}.tar.gz`

**Priority:** Critical | **Points:** 5  
**Dependencies:** E3.1, E4.1

---

### E4.3 — Track Scan Progress and Status API

**User Story:** As a **QA Engineer**, I want to poll scan status, so that I know when indexing completes.

**Acceptance Criteria:**
- **Given** running scan **When** GET /scans/{id} **Then** return phase, files_done, files_total
- **Given** completed scan **When** GET **Then** return framework, element_count, completed_at

**Priority:** Critical | **Points:** 3  
**Dependencies:** E4.1  
**Architecture:** GET /scans/{scan_id}

---

### E4.4 — Emit WebSocket Scan Progress Events

**User Story:** As a **QA Engineer**, I want real-time scan progress, so that I don't poll repeatedly.

**Acceptance Criteria:**
- **Given** subscribed client **When** scan progresses **Then** receive scan.progress events with percent
- **Given** scan completes **When** event emitted **Then** scan.complete includes element_count

**Priority:** High | **Points:** 5  
**Dependencies:** E4.3  
**PRD:** SYS-4

---

### E4.5 — Enforce Concurrent Scan Limits per Tenant

**User Story:** As the **Platform**, I want to limit concurrent scans, so that fair usage across tenants.

**Acceptance Criteria:**
- **Given** org at 2 running scans **When** third scan requested **Then** queue until slot available
- **Given** plan tier free **When** exceeding daily scan quota **Then** return 429 with upgrade message

**Priority:** Medium | **Points:** 3  
**Dependencies:** E4.1  
**PRD:** Scalability — 2 concurrent scans/tenant

---

### E4.6 — Idempotent Scan by Commit SHA

**User Story:** As the **Platform**, I want to skip re-parse for unchanged commits, so that resources are saved.

**Acceptance Criteria:**
- **Given** same repo_id + commit_sha already COMPLETE **When** re-scan requested **Then** return existing scan_id without re-processing
- **Given** new commit **When** scan runs **Then** full pipeline executes

**Priority:** High | **Points:** 5  
**Dependencies:** E4.2, E5.1  
**Architecture:** Idempotency rule

---

## E5: UI Parser & Framework Detection

### E5.1 — Implement Framework Detector

**User Story:** As the **Scan Worker**, I want to detect React vs Next.js, so that the correct parser is used.

**Acceptance Criteria:**
- **Given** package.json with "next" **When** detect runs **Then** framework=NEXTJS
- **Given** package.json with "react" only **When** detect runs **Then** framework=REACT
- **Given** Vue package.json **When** detect runs **Then** status=FAILED, error lists supported frameworks

**Priority:** Critical | **Points:** 5  
**Dependencies:** E4.2  
**PRD:** B1, AI-1, FR-2

---

### E5.2 — Implement ReactParser (JSX/TSX AST)

**User Story:** As the **Platform**, I want to parse React component files, so that JSX elements are extracted.

**Acceptance Criteria:**
- **Given** .tsx file with functional component **When** parsed **Then** components[] and jsx_elements[] populated
- **Given** syntax error in one file **When** parsing **Then** log error, continue scan, mark file as parse_failed

**Priority:** Critical | **Points:** 8  
**Dependencies:** E5.1  
**PRD:** B2

---

### E5.3 — Implement NextJsAppRouterParser

**User Story:** As the **Platform**, I want to parse Next.js App Router pages, so that routes map to components.

**Acceptance Criteria:**
- **Given** app/login/page.tsx **When** route extraction runs **Then** page route="/login" linked to component
- **Given** route groups (auth) **When** parsed **Then** routes resolved correctly per Next.js conventions

**Priority:** Critical | **Points:** 8  
**Dependencies:** E5.2  
**PRD:** B3

---

### E5.4 — Build Component Import Graph

**User Story:** As the **Platform**, I want parent-child component relationships, so that UI hierarchy is accurate.

**Acceptance Criteria:**
- **Given** Page imports LoginForm **When** graph built **Then** edge page→component→child elements exists
- **Given** barrel re-export **When** depth limit reached **Then** stop gracefully without crash

**Priority:** High | **Points:** 5  
**Dependencies:** E5.2  
**PRD:** C3

---

## E6: Locator Extraction Engine

### E6.1 — Extract Interactable Element Attributes

**User Story:** As the **Platform**, I want to extract testid, ARIA, roles, placeholders, links, so that locators are available for mapping.

**Acceptance Criteria:**
- **Given** input with data-testid="email" **When** extracted **Then** locator candidate strategy=testid, score≥0.96
- **Given** button with static text "Sign In" **When** extracted **Then** static_text and role+name candidates created

**Priority:** Critical | **Points:** 8  
**Dependencies:** E5.2  
**PRD:** C1, FR-3

---

### E6.2 — Associate Form Labels with Inputs

**User Story:** As the **Platform**, I want label↔input pairing, so that getByLabel locators are accurate.

**Acceptance Criteria:**
- **Given** label htmlFor="email" and input id="email" **When** paired **Then** label locator candidate rank ≤2
- **Given** aria-label without label **When** extracted **Then** role+name candidate used

**Priority:** High | **Points:** 5  
**Dependencies:** E6.1  
**PRD:** C2

---

### E6.3 — Compute Locator Stability Scores

**User Story:** As the **Platform**, I want ranked locators with stability tiers, so that users see high/medium/low quality.

**Acceptance Criteria:**
- **Given** data-testid present **When** scored **Then** rank=1, tier=high
- **Given** generated CSS class css-1a2b3c **When** scored **Then** penalty applied, tier=low

**Priority:** Critical | **Points:** 5  
**Dependencies:** E6.1  
**PRD:** B5

---

### E6.4 — Persist UI Elements with Source Traceability

**User Story:** As a **QA Engineer**, I want file:line for every element, so that I can verify extraction in source.

**Acceptance Criteria:**
- **Given** extracted element **When** persisted **Then** source_file and source_line populated
- **Given** element detail API **When** queried **Then** source_ref returned as `{file}:{line}`

**Priority:** Critical | **Points:** 3  
**Dependencies:** E6.1, E1.2  
**PRD:** B6

---

## E7: UI Knowledge Base, Embeddings & Search

### E7.1 — Generate and Store UI Element Embeddings

**User Story:** As the **AI Pipeline**, I want vector embeddings per element, so that semantic retrieval works.

**Acceptance Criteria:**
- **Given** new ui_element **When** content_hash unchanged **Then** skip re-embed
- **Given** 100 elements **When** embed batch runs **Then** upsert to ui_element_embeddings with vector(1536)

**Priority:** Critical | **Points:** 5  
**Dependencies:** E6.4  
**Architecture:** Embedding step 9

---

### E7.2 — Implement UI KB List Pages API

**User Story:** As a **QA Engineer**, I want to list pages by route, so that I can explore the app structure.

**Acceptance Criteria:**
- **Given** completed scan **When** GET /repositories/{id}/pages **Then** paginated pages with route, element_count
- **Given** search=login **When** filtered **Then** matching routes returned

**Priority:** High | **Points:** 3  
**Dependencies:** E5.3, E6.4

---

### E7.3 — Implement UI KB Search Elements API

**User Story:** As a **QA Engineer**, I want to search elements by keyword, so that I find locators quickly.

**Acceptance Criteria:**
- **Given** q=email and page_route=/login **When** search **Then** matching elements with locators returned in <2s p95
- **Given** 5000 elements **When** search **Then** performance within NFR target

**Priority:** Critical | **Points:** 5  
**Dependencies:** E7.1  
**PRD:** US-2, FR-4

---

### E7.4 — Build Dashboard UI KB Explorer

**User Story:** As a **QA Engineer**, I want a browse UI for Pages→Components→Elements, so that I validate scan quality visually.

**Acceptance Criteria:**
- **Given** completed scan **When** navigating explorer **Then** hierarchy renders with locator tiers color-coded
- **Given** element selected **When** viewing detail **Then** source link and all ranked locators shown

**Priority:** High | **Points:** 8  
**Dependencies:** E7.2, E7.3, E13.1  
**PRD:** US-2

---

## E8: User Story Management

### E8.1 — Create User Story API

**User Story:** As a **QA Engineer**, I want to submit a user story with acceptance criteria, so that it can be converted to tests.

**Acceptance Criteria:**
- **Given** valid payload **When** POST /repositories/{id}/stories **Then** 201 with user_story_id
- **Given** description >4000 chars **When** submit **Then** 400 Validation Error

**Priority:** High | **Points:** 3  
**Dependencies:** E3.2  
**PRD:** FR-5

---

### E8.2 — List and View User Stories

**User Story:** As a **QA Engineer**, I want to see my submitted stories, so that I can track generation history.

**Acceptance Criteria:**
- **Given** org stories exist **When** GET list **Then** return title, created_at, linked generation job status
- **Given** story id **When** GET detail **Then** return full description and acceptance_criteria

**Priority:** Medium | **Points:** 2  
**Dependencies:** E8.1

---

## E9: AI Test Planning & RAG Locator Mapping

### E9.1 — Implement LLM Provider Abstraction

**User Story:** As a **Developer**, I want a pluggable LLM provider, so that we can switch models and failover.

**Acceptance Criteria:**
- **Given** OpenAI configured **When** calling completion **Then** structured JSON returned per schema
- **Given** OpenAI failure **When** fallback enabled **Then** retry with Anthropic once

**Priority:** Critical | **Points:** 5  
**Dependencies:** E1.1

---

### E9.2 — Implement Story Agent (Test Plan Decomposition)

**User Story:** As a **QA Engineer**, I want my story decomposed into test steps, so that automation is structured.

**Acceptance Criteria:**
- **Given** login user story **When** Story Agent runs **Then** ≥4 steps including ≥1 assert action
- **Given** invalid LLM JSON **When** response **Then** retry up to 2 times; fail job with error if still invalid

**Priority:** Critical | **Points:** 8  
**Dependencies:** E8.1, E9.1  
**PRD:** D2, AI-3, FR-6

---

### E9.3 — Implement Hybrid RAG Retrieval

**User Story:** As the **AI Pipeline**, I want vector+keyword+graph retrieval, so that mapping candidates are relevant.

**Acceptance Criteria:**
- **Given** step "enter email on login page" **When** retrieve **Then** top-10 candidates include login page email input if exists
- **Given** retrieval **When** complete **Then** retrieval_trace stored for audit

**Priority:** Critical | **Points:** 8  
**Dependencies:** E7.1  
**PRD:** D3, AI-4

---

### E9.4 — Implement Mapping Agent with Confidence Scores

**User Story:** As a **QA Engineer**, I want each step mapped to a locator with confidence and rationale, so that I trust the output.

**Acceptance Criteria:**
- **Given** candidates list **When** Mapping Agent runs **Then** element_id chosen ONLY from list
- **Given** mapping complete **When** confidence <0.85 **Then** step flagged for review
- **Given** every mapping **When** confidence ≥0.5 **Then** rationale cites source_ref

**Priority:** Critical | **Points:** 8  
**Dependencies:** E9.2, E9.3  
**PRD:** D4, AI-5, FR-7

---

### E9.5 — Persist Test Plan IR and Generation Job State

**User Story:** As the **Platform**, I want generation jobs with Test Plan IR, so that state is resumable and auditable.

**Acceptance Criteria:**
- **Given** generation started **When** POST /generate **Then** 202 with job_id; status progresses planning→mapping→review|codegen
- **Given** job complete **When** queried **Then** test_plan_ir and model_versions stored

**Priority:** Critical | **Points:** 5  
**Dependencies:** E9.4  
**Architecture:** generation_jobs table

---

### E9.6 — Version Prompts and Track Model Versions

**User Story:** As a **QA Lead**, I want prompt/model version on each job, so that regressions are traceable.

**Acceptance Criteria:**
- **Given** generation job **When** complete **Then** model_versions JSON includes story_agent, mapping_agent model+prompt_hash
- **Given** prompt update **When** eval harness runs **Then** block deploy if precision drops >5%

**Priority:** High | **Points:** 3  
**Dependencies:** E9.4, E14.4  
**PRD:** AI-10

---

## E10: Review Queue & Human-in-the-Loop

### E10.1 — Review Queue API

**User Story:** As a **QA Engineer**, I want to see all low-confidence mappings, so that I can fix them before export.

**Acceptance Criteria:**
- **Given** job in review status **When** GET /generation-jobs/{id} **Then** review_items lists step_order, confidence, candidates, rationale
- **Given** all mappings ≥0.85 or human_verified **When** checked **Then** export allowed

**Priority:** Critical | **Points:** 5  
**Dependencies:** E9.5  
**PRD:** FR-8

---

### E10.2 — Override Locator Mapping API

**User Story:** As a **QA Engineer**, I want to select an alternate locator, so that exported tests use selectors I trust.

**Acceptance Criteria:**
- **Given** sub-threshold step **When** PATCH /mappings/{step_order} with valid element_id **Then** confidence set to 1.0, human_verified=true
- **Given** override **When** codegen runs **Then** Page Object uses override locator

**Priority:** Critical | **Points:** 5  
**Dependencies:** E10.1  
**PRD:** US-4

---

### E10.3 — Block Export Until Review Complete

**User Story:** As the **Platform**, I want export gated on review resolution, so that bad locators never ship silently.

**Acceptance Criteria:**
- **Given** unresolved review items **When** POST /export **Then** 409 Conflict with list of pending steps
- **Given** all resolved **When** export **Then** proceed to codegen/export pipeline

**Priority:** Critical | **Points:** 3  
**Dependencies:** E10.1  
**PRD:** AI-6, SM-C2

---

### E10.4 — Review Queue Dashboard UI

**User Story:** As a **QA Engineer**, I want a review UI with candidate picker, so that overrides are easy.

**Acceptance Criteria:**
- **Given** review required **When** opening job **Then** UI highlights low-confidence steps
- **Given** candidate selected **When** confirmed **Then** step marked resolved; export button enables when all done

**Priority:** High | **Points:** 8  
**Dependencies:** E10.2, E13.1  
**PRD:** US-4

---

## E11: Playwright Test Generation & Validation

### E11.1 — Locator-to-Playwright Code Mapper

**User Story:** As the **Codegen Engine**, I want strategy→Playwright API mapping, so that semantic locators are generated.

**Acceptance Criteria:**
- **Given** testid strategy **When** mapped **Then** output `page.getByTestId('...')`
- **Given** role+name **When** mapped **Then** output `page.getByRole('...', { name: '...' })`

**Priority:** Critical | **Points:** 5  
**Dependencies:** E9.4

---

### E11.2 — Page Object Template Generator

**User Story:** As a **QA Engineer**, I want Page Object classes generated, so that specs stay clean.

**Acceptance Criteria:**
- **Given** approved IR with login steps **When** codegen runs **Then** LoginPage.page.ts created with locator getters
- **Given** spec file **When** generated **Then** no hardcoded selectors in spec — only PO method calls

**Priority:** Critical | **Points:** 8  
**Dependencies:** E11.1  
**PRD:** E2, FR-9

---

### E11.3 — Playwright Spec Template Generator

**User Story:** As a **QA Engineer**, I want executable spec files, so that I can run tests in CI immediately.

**Acceptance Criteria:**
- **Given** login story IR **When** codegen **Then** *.spec.ts with describe/test structure and assertions from expected_outcome
- **Given** generated spec **When** inspected **Then** no `waitForTimeout` present

**Priority:** Critical | **Points:** 8  
**Dependencies:** E11.2  
**PRD:** E1, FR-9

---

### E11.4 — Code Validation (ESLint + tsc)

**User Story:** As the **Platform**, I want generated code validated, so that compile rate ≥95%.

**Acceptance Criteria:**
- **Given** generated files **When** validator runs **Then** ESLint custom rules pass (no xpath in spec, PO encapsulation)
- **Given** TypeScript output **When** tsc --noEmit **Then** zero syntax errors or job marked failed with diagnostics

**Priority:** High | **Points:** 5  
**Dependencies:** E11.3  
**PRD:** AI-8, SM-2

---

## E12: Export & Artifact Delivery

### E12.1 — Store Generated Artifacts in S3

**User Story:** As the **Platform**, I want artifacts stored securely, so that export is reliable.

**Acceptance Criteria:**
- **Given** codegen complete **When** stored **Then** files at s3://{org_id}/artifacts/{job_id}/ with checksums in generated_artifacts table
- **Given** artifacts **When** listed **Then** no credentials embedded; .env.example only placeholders

**Priority:** Critical | **Points:** 3  
**Dependencies:** E11.3

---

### E12.2 — ZIP Export with Presigned URL

**User Story:** As a **QA Engineer**, I want to download a ZIP of generated tests, so that I add them to our repo manually.

**Acceptance Criteria:**
- **Given** approved job **When** POST export type=zip **Then** presigned URL returned, valid 15 minutes
- **Given** ZIP contents **When** extracted **Then** includes spec, PO, README.qa-automater.md, .env.example

**Priority:** Critical | **Points:** 5  
**Dependencies:** E12.1, E10.3  
**PRD:** US-5, FR-10

---

### E12.3 — GitHub Pull Request Export

**User Story:** As a **QA Engineer**, I want a GitHub PR created with generated tests, so that my team reviews in normal workflow.

**Acceptance Criteria:**
- **Given** approved job **When** POST export type=github_pr with target_branch **Then** PR created on connected repo
- **Given** PR **When** viewed **Then** only test files added under target_path (default tests/e2e/); no unrelated files modified

**Priority:** Critical | **Points:** 8  
**Dependencies:** E12.1, E3.1, E10.3  
**PRD:** US-5, FR-10

---

### E12.4 — Generation Audit Log

**User Story:** As a **QA Lead**, I want audit trail of generations, so that traceability is maintained.

**Acceptance Criteria:**
- **Given** completed export **When** audit queried **Then** record includes story text, mappings, model_versions, export timestamp, user_id
- **Given** compliance review **When** exporting audit **Then** source_ref chain intact story→step→locator→file:line

**Priority:** High | **Points:** 3  
**Dependencies:** E12.2  
**PRD:** SYS-6

---

## E13: Dashboard & Real-Time UX

### E13.1 — Dashboard Shell and Navigation

**User Story:** As a **User**, I want a consistent dashboard layout, so that I navigate the product easily.

**Acceptance Criteria:**
- **Given** authenticated user **When** landing **Then** org selector, nav: Repositories, Generate, Settings
- **Given** page load **When** measured **Then** p95 <2s on broadband

**Priority:** High | **Points:** 5  
**Dependencies:** E2.1

---

### E13.2 — Repository Connect and Scan UI Flow

**User Story:** As a **Workspace Admin**, I want a guided repo connect flow, so that first scan succeeds quickly.

**Acceptance Criteria:**
- **Given** connect flow **When** scan running **Then** progress bar via WebSocket updates
- **Given** unsupported framework **When** scan fails **Then** error UI lists React/Next.js requirement

**Priority:** Critical | **Points:** 8  
**Dependencies:** E3.2, E4.4, E13.1  
**PRD:** US-1, SM-4

---

### E13.3 — Test Generation Wizard UI

**User Story:** As a **QA Engineer**, I want to paste a story and trigger generation, so that I get tests without API knowledge.

**Acceptance Criteria:**
- **Given** story form **When** submitted **Then** generation job created; user sees plan→mapping→review progress
- **Given** login golden story **When** complete flow **Then** user reaches export step

**Priority:** Critical | **Points:** 8  
**Dependencies:** E8.1, E9.5, E13.1  
**PRD:** US-3, SM-5

---

### E13.4 — Export UI (ZIP and GitHub PR)

**User Story:** As a **QA Engineer**, I want one-click export, so that artifacts reach my repo fast.

**Acceptance Criteria:**
- **Given** approved job **When** click Download ZIP **Then** browser downloads via presigned URL
- **Given** GitHub PR export **When** complete **Then** UI shows PR link opening in new tab

**Priority:** High | **Points:** 5  
**Dependencies:** E12.2, E12.3, E13.3

---

## E14: Security, Observability & Operations

### E14.1 — API Rate Limiting per Organization

**User Story:** As the **Platform**, I want rate limits, so that abuse and LLM cost overruns are prevented.

**Acceptance Criteria:**
- **Given** free tier **When** >10 generation jobs/hour **Then** 429 returned
- **Given** API calls **When** >100 req/min/user **Then** 429 with Retry-After header

**Priority:** High | **Points:** 3  
**Dependencies:** E2.3  
**PRD:** SYS-7

---

### E14.2 — Encrypt Repo Snapshots and Secrets at Rest

**User Story:** As a **Security Engineer**, I want encryption at rest, so that customer data is protected.

**Acceptance Criteria:**
- **Given** S3 objects **When** stored **Then** SSE-KMS enabled
- **Given** GitHub tokens **When** stored **Then** only in Secrets Manager, never logged

**Priority:** Critical | **Points:** 3  
**Dependencies:** E1.3, E3.1  
**PRD:** SYS-5, NFR Security

---

### E14.3 — Structured Logging and Alerting

**User Story:** As an **SRE**, I want alerts on failure rates, so that incidents are detected early.

**Acceptance Criteria:**
- **Given** scan failure rate >5% over 1h **When** threshold breached **Then** PagerDuty alert fires
- **Given** LLM error rate >2% **When** threshold breached **Then** alert fires

**Priority:** High | **Points:** 5  
**Dependencies:** E1.5

---

### E14.4 — AI Eval Harness (Golden Stories Gate)

**User Story:** As a **QA Architect**, I want regression tests on AI output, so that prompt changes don't degrade quality.

**Acceptance Criteria:**
- **Given** CI on main **When** eval runs **Then** 20 golden stories across 5 repos evaluated
- **Given** locator precision **When** below 80% **Then** CI fails blocking deploy

**Priority:** Critical | **Points:** 8  
**Dependencies:** E9.4, E11.4  
**PRD:** AI-9, SM-1

---

# PART 3 — SPRINT PLANNING RECOMMENDATION

| Sprint | Focus | Epics | Stories | Points (est.) |
|--------|-------|-------|---------|---------------|
| **S1** | Foundation + Auth | E1, E2 | E1.1–E1.4, E2.1–E2.4 | 46 |
| **S2** | GitHub + Scan Pipeline | E3, E4, E5 (start) | E3.1–E3.3, E4.1–E4.4, E5.1 | 44 |
| **S3** | Parser + Locators + DB | E5, E6 | E5.2–E5.4, E6.1–E6.4, E4.5–E4.6 | 52 |
| **S4** | UI KB + Embeddings + Explorer | E7, E13 (partial) | E7.1–E7.4, E13.1 | 41 |
| **S5** | Stories + AI Pipeline | E8, E9 | E8.1–E8.2, E9.1–E9.6 | 47 |
| **S6** | Review + Codegen + Export + Ops | E10–E14 | Remaining stories | 80 |

**Note:** S6 is heavy — split across S6a (E10–E12) and S6b (E13–E14) if team velocity <50.

**Parallel tracks after S2:** Frontend (E13) can start E13.1 after E2; AI (E9) requires E7 complete.

---

# PART 4 — TRACEABILITY MATRIX

| PRD Requirement | Epic | Story IDs |
|-----------------|------|-----------|
| A1 Org workspace | E2 | E2.2, E2.3, E2.5 |
| A2 GitHub OAuth | E3 | E3.1, E3.2, E3.3 |
| B1 Framework detection | E5 | E5.1 |
| B2 AST parsing | E5 | E5.2 |
| B3 Route graph | E5 | E5.3 |
| B4 UI KB explorer | E7, E13 | E7.2–E7.4 |
| B5 Locator stability | E6 | E6.3 |
| B6 Source traceability | E6 | E6.4 |
| C1 Attribute extraction | E6 | E6.1 |
| C2 Label association | E6 | E6.2 |
| C3 Component hierarchy | E5 | E5.4 |
| D1 Story ingestion | E8 | E8.1, E8.2 |
| D2 Test plan decompose | E9 | E9.2 |
| D3 Hybrid retrieval | E9 | E9.3 |
| D4 Confidence + rationale | E9 | E9.4 |
| D5 Review queue | E10 | E10.1–E10.4 |
| E1 Playwright spec | E11 | E11.3 |
| E2 Page Objects | E11 | E11.2 |
| E3 ZIP + GitHub PR | E12 | E12.2, E12.3 |
| SYS-1 Multi-tenant | E2 | E2.4 |
| SYS-2 Async queue | E4 | E4.1 |
| SYS-3 REST API | All | Per-story APIs |
| SYS-4 WebSocket progress | E4, E13 | E4.4 |
| SYS-5 Encrypted storage | E14 | E14.2 |
| SYS-6 Audit log | E12 | E12.4 |
| SYS-7 Rate limiting | E14 | E14.1 |
| AI-1 Framework detect | E5 | E5.1 |
| AI-2 Static extraction | E6 | E6.1 |
| AI-3 Story decompose | E9 | E9.2 |
| AI-4 Hybrid retrieval | E9 | E9.3 |
| AI-5 Locator mapping | E9 | E9.4 |
| AI-6 Confidence gating | E10 | E10.3 |
| AI-7 Codegen | E11 | E11.1–E11.3 |
| AI-8 Validation agent | E11 | E11.4 |
| AI-9 Eval harness | E14 | E14.4 |
| AI-10 Prompt versioning | E9 | E9.6 |
| US-1 Connect repo | E3, E4, E13 | E3.2, E4.3, E13.2 |
| US-2 Browse UI KB | E7, E13 | E7.3, E7.4 |
| US-3 Generate test | E8, E9, E13 | E8.1, E9.2–E9.5, E13.3 |
| US-4 Review mappings | E10 | E10.1–E10.4 |
| US-5 Export Playwright | E11, E12, E13 | E11.3, E12.2, E12.3, E13.4 |
| US-6 Invite team | E2 | E2.5 |
| SM-1 Locator precision | E14 | E14.4 |
| SM-2 Compile rate | E11 | E11.4 |
| SM-3 Time to export | E12, E13 | E12.2, E13.3 |
| SM-4 Activation UJ-1 | E13 | E13.2 |
| SM-5 Activation UJ-2 | E13 | E13.3, E13.4 |

**Coverage:** 100% of MVP PRD features mapped. P2/P3 features (Cypress, Jira, self-healing) intentionally excluded — see Recommendations.

---

# PART 5 — FUTURE EPICS (Out of MVP Scope)

| Epic ID | Name | Phase | PRD Features |
|---------|------|-------|--------------|
| F1 | Live App Crawler & Staging Validation | P2 | B5/C5, E7 |
| F2 | Cypress Export | P2 | E4 |
| F3 | Vue/Nuxt Parser | P2 | B1 |
| F4 | Jira/Linear Integration | P2 | A4 |
| F5 | GitHub Webhook Re-index | P2 | A5, B8 |
| F6 | Cloud Execution & Self-Healing | P3 | F1–F5 |

---

# PART 6 — RISKS & ASSUMPTIONS

## Product Risks

| Risk | Impact | Mitigation | Stories |
|------|--------|------------|---------|
| Low mapping accuracy | High | E10 review gate; E14.4 eval harness | E9.4, E10.3, E14.4 |
| Users abandon at review step | Medium | E10.4 UX; show confidence rationale | E10.4 |
| GitHub connect friction | High | E13.2 guided flow; clear errors | E3.1, E13.2 |

## Technical Risks

| Risk | Impact | Mitigation | Stories |
|------|--------|------------|---------|
| Parser failures | High | Per-file isolation E5.2 | E5.2 |
| LLM hallucination | High | Candidate-only E9.4 | E9.4 |
| Queue backlog | Medium | E4.5 fair scheduling | E4.5 |
| Cross-tenant leak | Critical | E2.4 RLS | E2.4 |

## Assumptions

1. Confidence threshold fixed at **0.85** for MVP (PRD open question)
2. **Clerk** for auth; **GitHub App** for repo access
3. **One repo per org** initially (PRD MVP); E3.2 allows expansion
4. **English-only** stories and UI
5. Default export path **`tests/e2e/`**

---

# PART 7 — RECOMMENDATIONS

1. **Start E14.4 eval harness early (S4)** — parallel with AI development; avoid late quality surprises  
2. **Dogfood on 3 open-source Next.js repos** before beta — validate SM-1/SM-2  
3. **Resolve PRD open questions before S5:** confidence threshold configurability, free tier limits  
4. **Do not pull P2 features into MVP** — Cypress/Jira will delay launch 8+ weeks  
5. **Import to Jira:** Use Epic = E1–E14; Story = E{n}.{m}; link PRD requirement IDs in custom field  
6. **Next artifact:** `bmad-ux` for E13 wireframes; `bmad-check-implementation-readiness` before S1 kickoff  

---

*End of Product Backlog v1.0*
