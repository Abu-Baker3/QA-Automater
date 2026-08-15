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
