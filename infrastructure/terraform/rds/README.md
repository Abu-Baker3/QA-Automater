# AWS RDS PostgreSQL 16 — E1.2 Production Scaffold

This module provisions a **Multi-AZ RDS PostgreSQL 16** instance with pgvector support, automated backups, and monitoring hooks.

> **Status:** Scaffold only — wire into your AWS account during E1 infrastructure rollout.

## Features

- PostgreSQL 16 on RDS (Multi-AZ)
- Parameter group with `shared_preload_libraries` ready for extensions
- pgvector via `CREATE EXTENSION vector` (run via Prisma migration after provision)
- Automated backups (7-day retention default)
- Enhanced monitoring + Performance Insights
- Security group restricted to ECS/PgBouncer subnets
- Secrets Manager for `DATABASE_MIGRATE_URL` and `DATABASE_POOL_URL`

## Usage

```hcl
module "rds" {
  source = "./modules/rds"

  project_name          = "qa-automater"
  environment           = "staging"
  vpc_id                = var.vpc_id
  private_subnet_ids    = var.private_subnet_ids
  allowed_security_groups = [var.ecs_tasks_sg_id, var.pgbouncer_sg_id]

  instance_class        = "db.t4g.medium"
  allocated_storage_gb  = 50
  max_allocated_storage_gb = 200
  multi_az              = true
  backup_retention_days = 7
  deletion_protection   = true
  pgbouncer_host        = "pgbouncer.internal.example.com"
}
```

When `pgbouncer_host` is set, Secrets Manager also stores `DATABASE_POOL_URL`.

## Post-provision steps

1. Set `DATABASE_MIGRATE_URL` to RDS endpoint (port 5432)
2. Run `pnpm db:migrate` from CI or deploy pipeline
3. Deploy PgBouncer with `DATABASE_POOL_URL` pointing to PgBouncer (port 6432)
4. Run `pnpm db:verify` in staging

## Failover & recovery

- **Multi-AZ:** Automatic failover on primary failure (~60–120s)
- **Backups:** Daily snapshots + point-in-time recovery
- **Restore:** Create new RDS instance from snapshot; update Secrets Manager URLs

## Connection budget

Size `max_connections` on RDS parameter group to match instance class. PgBouncer `max_db_connections` must stay below RDS `max_connections` minus admin/reserved headroom.
