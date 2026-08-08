# PRD Addendum — QA Automater

Technical and business context referenced by the PRD but not required in the main requirements narrative.

## Recommended MVP Technology Stack

| Layer | Choice |
|-------|--------|
| Dashboard | Next.js 15, TypeScript, Tailwind |
| API | NestJS or FastAPI |
| Parsing | ts-morph / Babel (JSX/TSX) |
| Queue | BullMQ + Redis or Temporal |
| Database | PostgreSQL + pgvector |
| Storage | S3-compatible object storage |
| LLM | OpenAI / Anthropic (abstracted provider) |
| Auth | Clerk or Auth0 |

## High-Level Architecture (Reference)

```
GitHub → Ingestion → Framework Detector → AST Parser → UI Knowledge Graph
                                                              ↓
User Story → Test Plan Agent → Locator Mapping Agent ← Vector + Graph Retrieval
                                                              ↓
                                    Review Queue → Codegen → ZIP / GitHub PR
```

## Locator Priority Ladder

1. `data-testid` / `data-cy`
2. ARIA role + accessible name
3. Label association
4. Stable `id`
5. Placeholder / name
6. Static text content
7. Stable CSS (BEM/custom)
8. XPath (avoid)

## Phase Roadmap (Post-MVP)

| Phase | Focus |
|-------|-------|
| Phase 2 | Live app crawler, Jira import, Cypress export, Vue support |
| Phase 3 | Cloud test execution, CI templates, failure reports |
| Phase 4 | Webhook diff detection, stale test alerts, self-healing v1 |
| Phase 5 | Coverage analysis, RCA, full requirement traceability |

## Competitive Positioning

**Category:** Source-native test generation (code-aware QA automation)

**Primary competitors:** Argus, QA Wolf, Assrt, mabl, Shiplight, GitHub Copilot

**Differentiation:** Persistent UI Knowledge Base from source code + requirement-to-locator traceability + portable Playwright output.

## Suggested SaaS Pricing (Post-Beta)

| Tier | Indicative Price |
|------|------------------|
| Starter | $99/mo — 1 repo, 50 stories |
| Team | $499/mo — 5 repos, GitHub PR export |
| Business | $1,499/mo — Jira, crawler, review workflows |
| Enterprise | Custom — VPC, SSO, SLA |

## MVP Team Estimate

4–6 FTE for 90–120 days: 1 AI/ML, 1 backend, 1 frontend, 1 QA automation architect (part-time), 1 product/design.
