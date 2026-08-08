# Database Migrations — E1.2

## Tooling

- **Prisma Migrate** — version-controlled SQL migrations
- **Direct URL** — `DATABASE_MIGRATE_URL` (bypasses PgBouncer)
- **Runtime URL** — `DATABASE_POOL_URL` (through PgBouncer)

## Commands

From repository root:

```bash
# Start Postgres + PgBouncer
pnpm db:up

# Apply migrations (staging/production/CI)
pnpm db:migrate

# Create new migration in development
pnpm db:migrate:dev

# Verify pgvector + migration health
pnpm db:verify
```

From `packages/database`:

```bash
pnpm migrate:deploy
pnpm migrate:status
pnpm verify
```

## Migration rules

1. Migrations are **idempotent** where possible (`IF NOT EXISTS`).
2. **Never** run migrations through PgBouncer — use `DATABASE_MIGRATE_URL`.
3. pgvector extension is required in migration `20260718120000_e1_2_init_pgvector`.
4. CI runs `db:migrate` + `db:verify` on every PR.

## Rollback

Prisma does not auto-rollback. For production, restore from RDS snapshot (see `infrastructure/terraform/rds/README.md`).
