---
title: QA Automater
status: final
created: 2026-06-21
updated: 2026-06-21
version: 2.0
document_type: Product Requirements Document
source: BRD — AI-Powered Automated Test Generation Platform
---

# Product Requirements Document: QA Automater

**Author:** Product Management  
**Stakeholders:** Engineering, Design, QA Architecture, Founders, Investors  
**Status:** Final v2.0 — BRD → PRD conversion

---

## 1. Product Overview

### Product Name Suggestion

**Primary:** **QA Automater**  
**Alternatives:** LocatorMind, SourceTest AI, TraceQA

*Recommendation:* Keep **QA Automater** — clear category signal, memorable, aligns with project workspace and domain.

### One-Line Description

> QA Automater is an AI SaaS platform that reads your frontend source code and user stories, then generates production-ready Playwright and Cypress tests you own in your repository.

### Problem Statement

Modern QA teams face a compounding automation bottleneck:

1. **Selector discovery is manual and fragile.** QA engineers spend 40–60% of automation effort finding and maintaining locators — especially across React/Next.js apps with dynamic rendering, component libraries, and missing `data-testid` conventions.

2. **Requirements and tests are disconnected.** User stories live in Jira; locators live in developers' heads; tests live in a separate repo folder. When the UI changes, nobody knows which tests broke or why.

3. **Existing AI tools force a tradeoff.** No-code platforms (mabl, Testim) reduce authoring time but create vendor lock-in. IDE copilots (Cursor, Copilot) generate one-off tests without a persistent UI catalog or requirement traceability. Neither reliably grounds tests in **source code**.

4. **Test maintenance scales linearly with product velocity.** Every sprint adds UI surface area; automation debt grows faster than headcount.

**Who feels this most:** QA leads and automation engineers at 20–500 person SaaS companies shipping React/Next.js web apps with Playwright or Cypress in CI.

### Solution Summary

QA Automater connects to a frontend Git repository, statically analyzes the codebase to build a **UI Knowledge Base** (pages, components, forms, ranked locators with source file references), accepts **User Stories in natural language**, and uses an **AI pipeline** to:

1. Decompose stories into executable test steps  
2. Map steps to extracted locators with confidence scores  
3. Generate Page Objects + Playwright/Cypress spec files  
4. Export via ZIP or GitHub Pull Request  

Human review gates low-confidence mappings. Every generated selector traces back to a source file line — requirement → test → locator → code.

---

## 2. Product Vision

### Long-Term Vision

Build a complete **AI QA Engineer** that:

| Capability | Description |
|------------|-------------|
| **Understand code** | Persistent UI Knowledge Base from repository analysis |
| **Understand requirements** | Natural language, Jira, acceptance criteria |
| **Create tests** | Playwright/Cypress + Page Objects + test data |
| **Execute tests** | Cloud runners integrated with CI/CD |
| **Maintain tests** | Detect repo changes, self-heal locators, update assertions |
| **Analyze failures** | Root cause analysis, flake detection, coverage gaps |

The platform evolves from **"generate tests from code + stories"** (MVP) to **"own the full QA automation lifecycle"** (Series A+ product).

### Success Definition

**12-month success (post-MVP launch):**

- 500+ registered workspaces; 100+ paying teams  
- ≥75% locator mapping precision on audited golden flows  
- ≥50% of generated tests pass on first CI run (with optional staging validation)  
- NPS ≥40 among QA automation engineers  
- $500K ARR run-rate  

**North star metric:** **Time from user story to merged, CI-green test PR** — target ≤30 minutes (MVP: ≤10 minutes to exportable artifact).

**Counter-metric:** Never optimize raw generation volume at the expense of mapping accuracy — one bad auto-export destroys trust permanently.

---

## 3. Target Users

### Primary Users

| User | Role | Primary need |
|------|------|--------------|
| **QA Automation Engineer** | Writes/maintains Playwright/Cypress suites | Faster test authoring, stable locators, less boilerplate |
| **QA Lead / Test Manager** | Owns coverage strategy and team velocity | Traceability, coverage visibility, scalable automation |

### Secondary Users

| User | Role | Primary need |
|------|------|--------------|
| **Frontend Developer** | Ships UI components | Fewer "what's the selector?" pings; optional test-id lint feedback |
| **Engineering Manager** | Balances velocity vs. quality | Confidence that automation keeps pace with shipping |
| **Product Owner** | Writes user stories | Stories that convert directly to verifiable tests |

### User Personas

#### Persona 1: Dana — QA Lead (Primary Buyer)

- **Profile:** 8 years QA, 3 years Playwright, 40-person B2B SaaS, Next.js App Router  
- **Pain:** Team of 2 QAs can't cover 15 new features/quarter; locators break every sprint  
- **Goal:** 3× test output without hiring; prove automation ROI to CTO  
- **Behavior:** Lives in GitHub + Playwright; skeptical of black-box AI; needs source traceability  
- **Quote:** *"I'll use AI if I can see exactly why it picked that selector and fix it when it's wrong."*

#### Persona 2: Marcus — QA Automation Engineer (Primary User)

- **Profile:** 4 years SDET, writes TypeScript Playwright tests daily  
- **Pain:** Page Object scaffolding, selector hunting, keeping tests DRY  
- **Goal:** Ship 5 new E2E tests/week instead of 2  
- **Behavior:** Wants code in repo, not a proprietary recorder; reviews PRs carefully  
- **Quote:** *"Generate the boilerplate — I'll own the assertions and edge cases."*

#### Persona 3: Priya — Engineering Manager (Influencer)

- **Profile:** Manages 12 engineers + 2 QAs, measured on release frequency and incident rate  
- **Pain:** QA is bottleneck; flakiness blocks releases  
- **Goal:** Automation that devs trust in CI without constant babysitting  
- **Behavior:** Evaluates tools on integration friction and team adoption, not feature count  

#### Persona 4: Alex — Frontend Developer (Secondary)

- **Profile:** React/Next.js developer, no desire to write E2E tests  
- **Pain:** QAs ask for `data-testid` additions mid-sprint  
- **Goal:** Clear conventions; optional "locator readiness" score for PRs  
- **Behavior:** Would adopt if friction is zero — prefers GitHub PR suggestions over another dashboard  

---

## 4. Core Features

Features grouped by product module. `[MVP]` = Phase 1; `[P2]` = Phase 2; `[P3]` = Phase 3.

### Module A: Workspace & Integrations

| ID | Feature | Phase |
|----|---------|-------|
| A1 | Organization workspace with Admin/Member roles | MVP |
| A2 | GitHub OAuth — connect, clone, branch select | MVP |
| A3 | GitLab / Bitbucket connectors | P2 |
| A4 | Jira / Linear / Azure DevOps story import | P2 |
| A5 | GitHub webhook — re-index on push | P2 |
| A6 | SSO (SAML/OIDC) + audit logs | P3 |

### Module B: Repository Scanner & UI Knowledge Base

| ID | Feature | Phase |
|----|---------|-------|
| B1 | Automatic framework detection (React, Next.js, Vue, Angular) | MVP: React/Next only |
| B2 | AST-based source parsing (JSX/TSX, templates) | MVP |
| B3 | Route/page graph construction | MVP |
| B4 | UI Knowledge Base explorer (search, filter, drill-down) | MVP |
| B5 | Locator stability scoring (testid > ARIA > label > id > text > CSS) | MVP |
| B6 | Source traceability (file:line for every element) | MVP |
| B7 | Monorepo app-root selector | P2 |
| B8 | Incremental re-index on diff | P2 |
| B9 | Locator readiness score / testability report | P2 |

### Module C: Locator Extraction Engine

| ID | Feature | Phase |
|----|---------|-------|
| C1 | Extract: `data-testid`, `data-cy`, `id`, `className`, ARIA, roles, placeholders, static text, links | MVP |
| C2 | Form field ↔ label association | MVP |
| C3 | Component hierarchy and parent-child relationships | MVP |
| C4 | Dynamic/lazy route awareness | P2 |
| C5 | Live app crawler (headless validation against staging URL) | P2 |
| C6 | i18n-aware locator strategies | P3 |

### Module D: AI Understanding Engine

| ID | Feature | Phase |
|----|---------|-------|
| D1 | User Story ingestion (plain text) | MVP |
| D2 | Test Plan decomposition (steps + expected outcomes) | MVP |
| D3 | Hybrid retrieval (vector + graph + keyword) for locator mapping | MVP |
| D4 | Confidence score + rationale per mapping | MVP |
| D5 | Human Review Queue for sub-threshold mappings | MVP |
| D6 | Batch story processing | P2 |
| D7 | Acceptance criteria → assertion mapping | P2 |
| D8 | Similar story / test reuse from history | P3 |

### Module E: Test Generator & Output

| ID | Feature | Phase |
|----|---------|-------|
| E1 | Playwright TypeScript spec generation | MVP |
| E2 | Page Object Model generation | MVP |
| E3 | ZIP export + GitHub PR export | MVP |
| E4 | Cypress JavaScript/TypeScript export | P2 |
| E5 | Test data placeholder generation | P2 |
| E6 | `playwright.config` / CI template snippets | P2 |
| E7 | Dry-run validation against staging URL | P2 |
| E8 | Custom codegen templates per org | P3 |

### Module F: Execution & Maintenance (Future)

| ID | Feature | Phase |
|----|---------|-------|
| F1 | Cloud test execution | P3 |
| F2 | Failure reports + screenshots/traces | P3 |
| F3 | AI self-healing locators | P3 |
| F4 | Stale test detection on repo change | P3 |
| F5 | Root cause analysis | P3 |
| F6 | Requirement ↔ test ↔ result traceability matrix | P3 |

---

## 5. MVP Definition

### Must-Have Features (Phase 1 Only)

| # | Capability | Rationale |
|---|------------|-----------|
| 1 | GitHub connect + branch scan | Primary ICP VCS; validates core ingestion loop |
| 2 | React + Next.js parser | ~60% of target ICP stack; single parser family (JSX/TSX) |
| 3 | UI Knowledge Base with locator ranking + source links | Core differentiator vs. copilots and recorders |
| 4 | Plain-text User Story input | Simplest requirement intake; no Jira dependency |
| 5 | AI Test Plan generation | Proves "understands requirements" claim |
| 6 | Locator mapping with confidence + rationale | Trust layer; prevents blind export |
| 7 | Review Queue for low-confidence mappings | Quality gate; reduces flaky test reputation risk |
| 8 | Playwright TypeScript + Page Object export | Industry-standard output; dev teams already use it |
| 9 | ZIP + GitHub PR export | Fits existing workflows; no vendor runner required |
| 10 | Org workspace (Admin/Member) | Minimum viable multi-user SaaS |

### Must NOT Include in MVP

| Excluded | Reason |
|----------|--------|
| Cypress export | Doubles codegen/templates; Playwright proves model first |
| Vue, Angular, Flutter Web | Each needs distinct parser; delays MVP 8–12 weeks |
| Test execution in platform | Heavy infra (browser pools, billing, support); not needed to prove generation |
| Self-healing / auto-maintenance | Requires execution telemetry + DOM diff engine |
| Visual AI / screenshot understanding | High cost, lower MVP ROI |
| Jira integration | Sales enabler for P2; plain text sufficient for beta |
| Live app crawler | Static analysis proves wedge; crawler is accuracy enhancer in P2 |
| SSO / SOC 2 / VPC | Enterprise blockers addressed when revenue validates |
| Fully autonomous zero-review export | Accuracy not sufficient without human gate |
| Monorepo intelligence | Edge case complexity; manual app-root in P2 |

### MVP Scope Reasoning

**Strategic wedge:** *Source-native Playwright generation for React/Next.js on GitHub.*

This is the smallest surface area that validates three critical assumptions:

1. **Static analysis produces usable locators** (≥80% precision on golden flows)  
2. **LLM story → step → locator mapping is trustworthy with review gates**  
3. **Teams will export and merge generated code** (not just demo in dashboard)

Everything else is expansion revenue, not validation risk. Shipping Cypress + Vue + execution in MVP would triple engineering scope without proving the core hypothesis.

**MVP timeline:** 90–120 days | **Team:** 4–6 FTE

---

## 6. User Stories

### US-1: Connect Repository

**As a** Workspace Admin,  
**I want to** connect my GitHub repository and scan a selected branch,  
**So that** the platform builds a UI Knowledge Base without manual element documentation.

**Acceptance Criteria:**
- GitHub OAuth completes with repo read scope  
- User selects branch; analysis job starts within 30 seconds  
- Progress states: Queued → Scanning → Indexing → Complete  
- On success: framework badge shown (React or Next.js)  
- On unsupported framework: clear error with supported list  
- Scan completes median <5 min for 500-file repo  

---

### US-2: Browse UI Knowledge Base

**As a** QA Automation Engineer,  
**I want to** search and browse extracted pages, components, and locators,  
**So that** I can verify the system understood our app before generating tests.

**Acceptance Criteria:**
- Navigate hierarchy: Pages → Components → Elements  
- Search by route, component name, testid, button text  
- Element detail shows ranked locators with stability tier (high/medium/low)  
- Each element links to source file and line number  
- Search returns in <2s for repos up to 5,000 elements  

---

### US-3: Generate Test from User Story

**As a** QA Automation Engineer,  
**I want to** paste a user story and receive a structured test plan with mapped locators,  
**So that** I can automate a flow without manually writing every step.

**Acceptance Criteria:**
- Input: title, description, optional acceptance criteria (≤4,000 chars)  
- Output: ordered Test Plan with action types (navigate, fill, click, assert)  
- Each step shows mapped locator, confidence score (0–1), and rationale  
- Steps with confidence <0.85 flagged for review  
- Login story decomposes to ≥4 steps including ≥1 assertion  
- Generation completes median <3 min after scan is complete  

---

### US-4: Review and Override Locator Mappings

**As a** QA Automation Engineer,  
**I want to** approve or override low-confidence locator mappings,  
**So that** exported tests use selectors I trust.

**Acceptance Criteria:**
- Review Queue lists all sub-threshold mappings grouped by story  
- User can select alternate locator from ranked candidates or search UI KB  
- Override requires confirmation; persisted to generation job  
- Export blocked until all flagged mappings resolved  
- Override reflected in generated Page Objects  

---

### US-5: Export Playwright Tests

**As a** QA Automation Engineer,  
**I want to** export generated Playwright tests as a ZIP or GitHub PR,  
**So that** tests live in our repo and run in our existing CI pipeline.

**Acceptance Criteria:**
- Export includes: spec file(s), Page Object class(es), README with setup steps  
- Code uses `getByTestId` / `getByRole` — no `waitForTimeout`  
- No embedded credentials; env var placeholders for secrets  
- ZIP is self-contained runnable structure  
- GitHub PR targets configurable branch; default path `tests/e2e/`  
- TypeScript compiles without syntax errors  

---

### US-6: Invite Team Members (MVP stretch)

**As a** Workspace Admin,  
**I want to** invite QA engineers to my organization,  
**So that** my team can collaboratively generate and review tests.

**Acceptance Criteria:**
- Invite via email; Member role can generate/review/export  
- Admin role can connect repos and manage members  
- Tenant data isolated between organizations  

---

## 7. Functional Requirements

### 7.1 System-Level Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| SYS-1 | Multi-tenant SaaS with organization-scoped data isolation | P0 |
| SYS-2 | Async job queue for repo scan and test generation | P0 |
| SYS-3 | REST/GraphQL API for all dashboard operations | P0 |
| SYS-4 | Job status polling or WebSocket progress updates | P0 |
| SYS-5 | Encrypted storage for repo snapshots and OAuth tokens | P0 |
| SYS-6 | Audit log of generation jobs (story text, mappings, export timestamp) | P1 |
| SYS-7 | Rate limiting per organization (API + LLM credits) | P1 |
| SYS-8 | Admin dashboard for internal ops (job failures, usage) | P2 |

### 7.2 AI Capabilities Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| AI-1 | **Framework detection:** classify React vs Next.js from `package.json` + file patterns with ≥95% accuracy on golden set | P0 |
| AI-2 | **Static extraction:** parse JSX/TSX AST; extract interactable elements with ≥90% recall on elements with explicit test attributes | P0 |
| AI-3 | **Story decomposition:** convert NL user story to structured Test Plan JSON schema | P0 |
| AI-4 | **Hybrid retrieval:** combine vector search (UI element embeddings), graph traversal (route/component neighbors), and keyword match (testid, label) | P0 |
| AI-5 | **Locator mapping:** assign Confidence Score + natural-language rationale citing source reference | P0 |
| AI-6 | **Confidence gating:** block export when any mapping <0.85 until human resolution | P0 |
| AI-7 | **Codegen:** produce valid Playwright TS from approved Test Plan IR via template + LLM fill | P0 |
| AI-8 | **Validation agent:** lint output for anti-patterns (hard waits, xpath preference, inline selectors in specs) | P1 |
| AI-9 | **Eval harness:** regression suite of ≥20 golden stories across ≥5 open-source repos | P0 |
| AI-10 | **Prompt/model versioning:** track which model version produced each artifact | P1 |

### 7.3 Test Plan Intermediate Representation (IR)

All AI outputs must pass through structured IR before codegen:

```json
{
  "story_id": "uuid",
  "steps": [{
    "order": 1,
    "action": "navigate|fill|click|assert|select",
    "target_description": "email input on login page",
    "mapped_element_id": "login.email_input",
    "locator": { "strategy": "testid", "value": "email-input" },
    "confidence": 0.92,
    "rationale": "Matched data-testid in LoginForm.tsx:42",
    "source_ref": "src/auth/LoginForm.tsx:42",
    "expected_outcome": "Email field is visible"
  }]
}
```

---

## 8. Non-Functional Requirements

### Performance

| Metric | Target (MVP) |
|--------|--------------|
| Dashboard page load | <2s p95 |
| UI KB search | <2s p95 (≤5,000 elements) |
| Repo scan (500 files) | <5 min median |
| Story → Test Plan | <60s p95 |
| Story → exportable artifact | <10 min median (incl. review) |
| Concurrent scan jobs per tenant | 2 (MVP); 10 (P2) |

### Scalability

| Dimension | MVP | Scale target (Year 1) |
|-----------|-----|------------------------|
| Repositories per org | 1 (expand to 5 in v1.1) | 50 |
| Indexed elements per repo | 10,000 | 100,000 |
| Tenants | 100 beta | 5,000 |
| LLM calls | Batched; cache embeddings per file hash | Regional inference endpoints |
| Storage | S3 per-tenant prefix | Lifecycle policies; cold archive |

Architecture: stateless API + horizontal worker pool + PostgreSQL + pgvector + Redis queue.

### Security

| Requirement | Implementation |
|-------------|----------------|
| Data in transit | TLS 1.2+ everywhere |
| Data at rest | AES-256 (KMS-managed keys) |
| OAuth tokens | Vault/secrets manager; never logged |
| Source code | Tenant-isolated storage; deletion on disconnect |
| LLM data handling | Enterprise API agreements; no training on customer code |
| Auth | Email/password + GitHub OAuth (MVP); SSO in P3 |
| RBAC | Admin, Member (MVP); custom roles in P3 |
| Compliance roadmap | SOC 2 Type II target Month 12 |

### Reliability

| Requirement | Target |
|-------------|--------|
| Platform uptime | 99.5% MVP; 99.9% GA |
| Job retry | 3 retries with exponential backoff on transient failures |
| Idempotent scans | Re-scan same commit produces identical index |
| Backup | Daily DB backup; 7-day retention MVP |
| Disaster recovery | RPO 24h MVP; RTO 4h |

---

## 9. System Modules (High Level)

```
┌─────────────────────────────────────────────────────────────────┐
│                        QA AUTOMATER PLATFORM                     │
├─────────────┬─────────────┬─────────────┬─────────────┬───────────┤
│ Repository  │  Locator    │     AI      │    Test     │  Output   │
│  Scanner    │ Extraction  │ Understanding│ Generator  │ Formatter │
│             │   Engine    │   Engine    │             │           │
├─────────────┼─────────────┼─────────────┼─────────────┼───────────┤
│ Git clone   │ Attribute   │ Story       │ Playwright  │ ZIP       │
│ Framework   │ visitor     │ decompose   │ templates   │ GitHub PR │
│ detect      │ Stability   │ Retrieval   │ Page Object │ README    │
│ AST parse   │ score       │ Mapping     │ factory     │ CI hints  │
│ Route graph │ Label assoc │ Confidence  │ Lint/valid  │ (P2)      │
│ UI KB build │ Graph edges │ Review gate │             │           │
└─────────────┴─────────────┴─────────────┴─────────────┴───────────┘
         │              │              │              │
         └──────────────┴──────────────┴──────────────┘
                              │
                    PostgreSQL + pgvector
                    Redis Job Queue + S3
```

### Module Descriptions

| Module | Input | Output | Owner (build) |
|--------|-------|--------|-----------------|
| **Repository Scanner** | GitHub repo + branch | Parsed AST, route map, file index | Backend + parser specialist |
| **Locator Extraction Engine** | AST nodes | Ranked locator candidates per element | Backend + QA architect |
| **AI Understanding Engine** | User Story + UI KB | Test Plan IR + mappings | AI/ML engineer |
| **Test Generator** | Approved IR | Playwright spec + Page Object TS | Backend + QA architect |
| **Output Formatter** | Generated files | ZIP bundle or GitHub PR payload | Backend |

---

## 10. User Flow (End-to-End)

### Flow A: First-Time Setup → First Test (Happy Path)

```
Step 1  SIGN UP
        User creates account → creates Organization "Acme QA"

Step 2  CONNECT REPO
        Admin → Integrations → GitHub OAuth
        Select repo: acme/web-app, branch: main
        Click "Analyze Repository"

Step 3  SCAN (async, 2–5 min)
        System: clone → detect Next.js → parse 412 files
        Build UI Knowledge Base: 23 pages, 187 components, 1,240 elements
        Email/notification: "Scan complete"

Step 4  EXPLORE (optional validation)
        User searches "login" → views /login page elements
        Confirms data-testid="email-input" → LoginForm.tsx:42

Step 5  SUBMIT STORY
        User → Generate Tests → New Story
        Pastes: "As a user, I want to log in so I can access my dashboard"
        Adds acceptance criteria: "Dashboard shows welcome message"

Step 6  AI PROCESSING (~2 min)
        6a. Decompose → 5-step Test Plan
        6b. Retrieve → candidate locators per step
        6c. Map → 4 steps high confidence, 1 medium (dashboard assertion)

Step 7  REVIEW
        User opens Review Queue → dashboard assertion at 0.72 confidence
        Selects alternate: getByRole('heading', { name: 'Dashboard' })
        Approves → all mappings ≥0.85

Step 8  GENERATE CODE
        System produces:
        - tests/e2e/auth/login.spec.ts
        - tests/pages/LoginPage.ts
        - tests/pages/DashboardPage.ts

Step 9  EXPORT
        User clicks "Open GitHub PR" → PR #847 created on acme/web-app
        Team reviews, merges, CI runs Playwright → green

Step 10 MAINTAIN (P2+)
        Dev changes LoginForm → webhook triggers re-scan
        System flags login.spec.ts as potentially stale
```

### Flow B: Error Paths

| Trigger | System behavior | User action |
|---------|-----------------|-------------|
| Unsupported framework (Vue) | Scan fails with supported list | Wait for P2 or use React repo |
| All mappings low confidence | Export blocked; Review Queue full | Manual override each step |
| GitHub token expired | Re-auth prompt | Reconnect OAuth |
| LLM timeout | Job retry ×3, then fail with support link | Retry or contact support |

---

## 11. Roadmap

### Phase 1 — MVP (Months 1–4)

**Goal:** Prove source-native Playwright generation for React/Next.js.

- GitHub + React/Next scanner + UI KB  
- Story → Test Plan → Mapping → Review → Playwright export  
- Org workspace, beta with 20 design partners  
- Golden eval harness (20 flows, 5 repos)  
- **Exit criteria:** SM-1 ≥80% locator precision, SM-2 ≥95% compile rate, 10 paying teams  

### Phase 2 — Enhancements (Months 5–8)

**Goal:** Improve accuracy, expand stack, connect to PM tools.

- Live staging URL crawler (dry-run validation)  
- Cypress export  
- Vue.js + Nuxt parser  
- Jira / Linear import  
- GitHub webhook re-index  
- Monorepo app-root selector  
- Multiple repos per org  
- **Exit criteria:** ≥50% first-run CI pass rate with crawler  

### Phase 3 — Advanced AI (Months 9–14)

**Goal:** Close the loop — execute, heal, maintain.

- Cloud Playwright/Cypress execution  
- Failure analysis + trace viewer  
- Self-healing locators v1  
- Stale test detection on repo diff  
- Angular support  
- Test coverage vs. requirements matrix  
- SSO + SOC 2 Type II  
- **Exit criteria:** $500K ARR, 100 paying teams, self-heal resolves ≥40% of locator failures  

### Phase 4 — AI QA Engineer (Months 15–24)

- Root cause analysis  
- Automatic test updates on UI change PRs  
- Visual regression integration  
- Test data generation  
- Enterprise VPC deployment  

---

## 12. Risks & Challenges

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Static analysis misses runtime-only UI | High | P2 live crawler; confidence gating; review queue |
| Parser breaks on new framework versions | Medium | Golden repo CI; parser version pinning |
| LLM hallucinates locators | High | IR pipeline; retrieval required; no direct story→code |
| Large monorepos timeout | Medium | Incremental indexing; file ignore patterns |
| Generated tests flaky in CI | High | Ban anti-patterns; staging dry-run in P2 |

### AI Limitations

| Limitation | Mitigation |
|------------|------------|
| Dynamic JSX (`{props.label}`) — can't resolve static text | Prefer testid/ARIA; flag dynamic elements as low confidence |
| Cross-page state (auth cookies, localStorage) | Detect auth patterns; generate storageState setup in P2 |
| Complex multi-step wizards | Decompose to sub-flows; human review on >8 steps |
| i18n/multilingual UI | P3 locale-aware strategies; MVP English-only |
| Model drift | Eval harness on every prompt/model change |

### Scalability Issues

| Issue | Mitigation |
|-------|------------|
| LLM cost at scale | Template-heavy codegen; cache embeddings; tiered models |
| Repo storage growth | Diff-based retention; delete on disconnect |
| Scan queue backlog | Horizontal workers; priority tiers by plan |
| Vector index size | Partition by tenant; archive cold repos |

### Business Risks

| Risk | Mitigation |
|------|------------|
| Copilot "good enough" for one-off tests | Persistent KB + traceability + team workflows |
| Competitors add code export | Ship traceability moat fast; open-source eval benchmark |
| Enterprise security blockers | SOC 2 roadmap; self-hosted tier in P3 |
| Low conversion from free | Limit free tier; PLG via "locator readiness score" |

---

## 13. Business Potential

### SaaS Potential

**Category:** DevTools / QA Automation / AI Developer Productivity  
**TAM (rough):** ~$8B global test automation market (2026); AI-native segment growing 25%+ CAGR  
**SAM:** ~$1.2B — web E2E automation for mid-market SaaS (20–500 employees)  
**SOM (Year 3):** $15–25M ARR — 2,000 teams at $600/mo blended ARPU  

**Why SaaS fits:**
- Recurring value: repo re-indexing, story processing, future execution minutes  
- Natural expansion: seats → repos → LLM credits → execution → enterprise  
- High gross margin target (70%+) once embedding cache matures  

### Target Market

**ICP (Ideal Customer Profile):**
- Company size: 20–500 employees  
- Industry: B2B SaaS, fintech, healthtech web apps  
- Stack: React or Next.js + Playwright + GitHub + CI/CD  
- Trigger: QA team ≤5 people, release weekly+, automation backlog growing  

**Beachhead:** Next.js SaaS startups with 1–2 QA engineers already using Playwright.

**Expansion:** Enterprise QA orgs (100+ testers), agencies building for clients, platform teams governing test standards.

### Monetization Ideas

| Tier | Price | Includes |
|------|-------|----------|
| **Free** | $0 | 1 repo, 10 stories/mo, ZIP export only, community support |
| **Starter** | $99/mo | 1 repo, 50 stories, GitHub PR export, 2 seats |
| **Team** | $499/mo | 5 repos, 300 stories, review workflows, 5 seats |
| **Business** | $1,499/mo | 20 repos, Jira import, crawler, 15 seats, priority support |
| **Enterprise** | Custom | SSO, VPC, SLA, unlimited, professional services |

**Usage add-ons:**
- Extra LLM generation credits ($0.50/story)  
- Cloud execution minutes (Phase 3)  
- Self-healing events (Phase 3)  

**PLG hooks:**
- Free "Locator Readiness Score" for public GitHub repos (viral)  
- GitHub Action: comment PR with testability impact  

### Competitive Moat (Investor Narrative)

1. **Source-native UI Knowledge Base** — compounding asset per repo; not disposable chat output  
2. **Traceability graph** — requirement → test → locator → source line (compliance + debug)  
3. **Portable codegen** — customer owns tests; reduces churn vs. mabl/Testim  
4. **Eval benchmark** — publish open golden-set scores; build trust vs. black-box claims  

---

## Appendix A: Success Metrics Summary

| ID | Metric | MVP Target |
|----|--------|------------|
| SM-1 | Locator precision (golden audit) | ≥80% |
| SM-2 | Generated test compile rate | ≥95% |
| SM-3 | Story → exportable artifact time | ≤10 min median |
| SM-4 | Beta activation (complete UJ-1) | ≥60% |
| SM-5 | Beta activation (complete UJ-2) | ≥40% |

## Appendix B: Open Questions

1. Confidence threshold: fixed 0.85 or org-configurable?  
2. Free tier vs. paid-only beta?  
3. Default export path: `tests/e2e/` or detect from repo?  
4. Include optional staging URL field in MVP UI (for P2 crawler)?  

## Appendix C: Downstream Artifacts

| Artifact | Skill / Owner |
|----------|---------------|
| Architecture ADRs | `bmad-create-architecture` |
| UX flows & wireframes | `bmad-ux` |
| Epics & user stories | `bmad-create-epics-and-stories` |
| Implementation readiness | `bmad-check-implementation-readiness` |

---

*End of PRD v2.0*
