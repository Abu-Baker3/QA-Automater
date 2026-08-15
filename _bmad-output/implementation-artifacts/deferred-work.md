# Deferred Work

## Deferred from: code review of E1.2-postgres-pgvector.md (2026-07-20)

- **No SSL/TLS on database connections yet** — `packages/database/src/pool.ts` — deferred, production hardening in E1.4
- **`checkDatabaseHealth()` swallows error details** — `packages/database/src/pool.ts` — deferred, acceptable for MVP health endpoint
- **Manual `_schema_meta` in migration alongside Prisma model may drift** — migration SQL — deferred, monitor on next migration

## Deferred from: code review of E1.3-redis-s3.md (2026-08-08)

- **`S3StorageService.exists` swallows non-404 AWS errors** — `packages/shared/src/storage/index.ts:172-183` — deferred, standard AWS S3 wrapper convention for MVP

## Deferred from: code review of E1.4-ecs-deployment.md (2026-08-08)

- **Export Worker Autoscaling** — `infrastructure/terraform/ecs/main.tf` — deferred, fixed capacity (desired_count = 1) is sufficient for MVP export workload

## Deferred from: code review of E4.5-enforce-concurrent-scan-limits-per-tenant.md (2026-08-14)

- **In-memory `scansStore` for tenant concurrency & daily quota tracking** — `apps/api/src/scans/scans.service.ts` — deferred, in-memory tracking is sufficient for MVP single-instance API; multi-node distributed Redis tracking deferred for production cluster scaling.

## Deferred from: code review of E4.6-idempotent-scan-by-commit-sha.md (2026-08-15)

- **Composite database index `(repository_id, commit_sha, status)` for commit idempotency lookup** — `apps/api/src/scans/scans.service.ts` — deferred, in-memory Map lookup is sufficient for MVP; database index optimization deferred for production scaling.

## Deferred from: code review of E5.1-implement-framework-detector.md (2026-08-15)

- **Recursive workspace `package.json` search for monorepo target apps** — `workers/scan/src/framework-detector.ts` — deferred, root `package.json` inspection is standard for MVP; multi-package root discovery deferred for E5.3.

## Deferred from: code review of E5.2-implement-react-parser.md (2026-08-15)

- **Anonymous default export component name resolution (`export default function()`)** — `workers/scan/src/react-parser.ts` — deferred, named function & arrow function component extraction is standard for MVP; default export fallback naming deferred for E5.3.

## Deferred from: code review of E5.3-implement-nextjs-app-router-parser.md (2026-08-15)

- **Intercepting route `(.)` & `@slot` parallel route metadata tagging** — `workers/scan/src/nextjs-app-router-parser.ts` — deferred, standard App Router pages, route groups, and dynamic routes are supported for MVP; slot/intercept metadata tagging deferred for E5.4.

## Deferred from: code review of E5.4-build-component-import-graph.md (2026-08-15)

- **Dynamic `import()` expressions & React `lazy()` resolution** — `workers/scan/src/component-import-graph.ts` — deferred, static ES/TS imports are extracted for MVP; dynamic lazy import tracking deferred for E6.

## Deferred from: code review of E6.1-extract-interactable-element-attributes.md (2026-08-15)

- **Form `<label htmlFor>` ↔ `<input id>` cross-element pairing** — `workers/scan/src/locator-extractor.ts` — deferred for E6.2 (as defined in product backlog story dependencies).

## Deferred from: code review of E6.2-associate-form-labels-with-inputs.md (2026-08-15)

- **Multi-ID `aria-labelledby` resolution** — `workers/scan/src/form-label-associator.ts` — deferred, direct `htmlFor`/`id` and `aria-label` pairing is implemented for MVP; multi-ID `aria-labelledby` resolution deferred for E6.3.

## Deferred from: code review of E6.3-compute-locator-stability-scores.md (2026-08-15)

- **Dynamic DOM position volatility score weighting** — `workers/scan/src/locator-extractor.ts` — deferred, static AST stability scoring is implemented for MVP; live DOM re-render stability tracking deferred for E8 runtime suite.

## Deferred from: code review of E6.4-persist-ui-elements-with-source-traceability.md (2026-08-15)

- **Source code snippet preview window fetching in element detail API** — `apps/api/src/elements/elements.controller.ts` — deferred, `source_ref: "{file}:{line}"` string returned for MVP; AST snippet preview window rendering deferred for E7 UI KB.

## Deferred from: code review of E7.1-generate-and-store-ui-element-embeddings.md (2026-08-15)

- **Remote OpenAI / Vertex AI Embedding API HTTP client integration** — `workers/ai/src/embedding-service.ts` — deferred, deterministic 1536-dimensional embedding generator implemented for offline pipeline unit testing; remote OpenAI `text-embedding-3-small` / Gemini API client integration deferred for E7.2 vector search.

## Deferred from: code review of E7.2-implement-ui-kb-list-pages-api.md (2026-08-16)

- **Prisma database persistence for scanned repository pages table** — `apps/api/src/repositories/repositories.service.ts` — deferred, `pagesStore` Map in `RepositoriesService` implemented for fast in-memory MVP querying; persistent relational schema table for scanned pages deferred for E7.4.

## Deferred from: code review of E7.3-implement-ui-kb-search-elements-api.md (2026-08-16)

- **Hybrid pgvector cosine similarity search engine integration** — `apps/api/src/elements/elements.service.ts` — deferred, high-performance keyword & metadata search index implemented for MVP; vector embedding similarity integration (`pgvector` HNSW index query) deferred for E7.4.

## Deferred from: code review of E7.4-build-dashboard-ui-kb-explorer.md (2026-08-16)

- **Live NestJS API fetch integration for UI KB Explorer tab (`GET /repositories/:id/pages` and `GET /elements/search`)** — `apps/web/src/app/page.tsx` — deferred, client-side structured mock KB hierarchy (`MOCK_KB_PAGES`) is implemented for fast MVP UI demonstration & testing; live SWR/React Query API endpoint binding deferred for Epic 8 runtime suite.

## Deferred from: code review of E8.1-create-user-story-api.md (2026-08-16)

- **Prisma database persistence for user stories table (`UserStory` model)** — `apps/api/src/stories/stories.service.ts` — deferred, in-memory `storiesStore` Map in `StoriesService` is implemented for fast MVP querying; persistent Prisma relational schema table deferred for E8.2 list and view stories story.


