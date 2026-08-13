# Connection Pooling — PgBouncer

## Architecture

```
API / Workers  →  DATABASE_POOL_URL (port 6432)  →  PgBouncer  →  PostgreSQL (port 5432)
Migrations     →  DATABASE_MIGRATE_URL (port 5432)  →  PostgreSQL (direct)
```

## Local defaults

| Setting                  | Value       |
| ------------------------ | ----------- |
| PgBouncer port           | 6432        |
| Postgres port            | 5432        |
| pool_mode                | transaction |
| max_client_conn          | 100         |
| default_pool_size        | 20          |
| max_db_connections       | 40          |
| Postgres max_connections | 100         |

## Application pool (`pg` Pool)

| Env                           | Default | Description                      |
| ----------------------------- | ------- | -------------------------------- |
| `DATABASE_POOL_MAX`           | 10      | Max connections per API instance |
| `DATABASE_IDLE_TIMEOUT_MS`    | 30000   | Idle timeout                     |
| `DATABASE_CONNECT_TIMEOUT_MS` | 5000    | Connect timeout                  |

**Budget:** With `max_db_connections=40` on PgBouncer and Postgres `max_connections=100`, total backend connections stay within budget.

## Health checks

- PgBouncer: Docker healthcheck via `pg_isready` on port 6432
- API: `GET /health` includes database status and active connection count

## Production (RDS)

- RDS parameter group: `max_connections` sized per instance class
- PgBouncer runs as sidecar or dedicated ECS service
- Secrets: `DATABASE_POOL_URL`, `DATABASE_MIGRATE_URL` in AWS Secrets Manager
