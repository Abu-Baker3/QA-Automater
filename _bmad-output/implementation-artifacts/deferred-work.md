# Deferred Work

## Deferred from: code review of E1.2-postgres-pgvector.md (2026-07-20)

- **No SSL/TLS on database connections yet** — `packages/database/src/pool.ts` — deferred, production hardening in E1.4
- **`checkDatabaseHealth()` swallows error details** — `packages/database/src/pool.ts` — deferred, acceptable for MVP health endpoint
- **Manual `_schema_meta` in migration alongside Prisma model may drift** — migration SQL — deferred, monitor on next migration

## Deferred from: code review of E1.3-redis-s3.md (2026-08-08)

- **`S3StorageService.exists` swallows non-404 AWS errors** — `packages/shared/src/storage/index.ts:172-183` — deferred, standard AWS S3 wrapper convention for MVP

## Deferred from: code review of E1.4-ecs-deployment.md (2026-08-08)

- **Export Worker Autoscaling** — `infrastructure/terraform/ecs/main.tf` — deferred, fixed capacity (desired_count = 1) is sufficient for MVP export workload


