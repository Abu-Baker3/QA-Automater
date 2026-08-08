# QA Automater

AI-powered SaaS platform that analyzes frontend source repositories, maps user stories to UI locators, and generates production-ready Playwright tests.

## Monorepo Structure

```
├── apps/
│   ├── web/          # Next.js 15 dashboard
│   └── api/          # NestJS REST API
├── workers/
│   ├── scan/         # Repository scan & AST parsing
│   ├── ai/           # LLM orchestration & RAG
│   └── export/       # ZIP / GitHub PR artifact export
├── packages/
│   ├── config/       # Shared ESLint & TypeScript configs
│   ├── database/     # Prisma migrations, pg pool, pgvector verify
│   ├── types/        # Shared TypeScript types
│   ├── shared/       # Shared utilities & health server
│   └── ui/           # Shared React UI utilities
├── docker/           # Local infrastructure (Postgres, PgBouncer, Redis)
├── infrastructure/   # Terraform (RDS scaffold)
└── .github/workflows # CI/CD pipelines
```

## Prerequisites

- **Node.js** 20 LTS ([`.nvmrc`](.nvmrc))
- **pnpm** 9.x (`corepack enable`)
- **Docker** (optional, for local infra and image builds)

## Quick Start

```bash
# Install dependencies
pnpm install

# Build shared packages
pnpm --filter @qa-automater/types build
pnpm --filter @qa-automater/shared build
pnpm --filter @qa-automater/ui build

# Start local infrastructure (Postgres 16 + pgvector, PgBouncer, Redis)
docker compose -f docker/docker-compose.yml up -d

# Apply migrations and verify pgvector
pnpm db:migrate
pnpm db:verify

# Copy environment template
cp .env.example .env

# Run all apps in dev mode
pnpm dev
```

### Service URLs (local)

| Service       | URL                   | Port |
|---------------|-----------------------|------|
| Web           | http://localhost:3001 | 3001 |
| API           | http://localhost:3000 | 3000 |
| Scan worker   | http://localhost:8081/health | 8081 |
| AI worker     | http://localhost:8082/health | 8082 |
| Export worker | http://localhost:8083/health | 8083 |

## Scripts

| Command          | Description                          |
|------------------|--------------------------------------|
| `pnpm build`     | Build all packages, apps, workers    |
| `pnpm dev`       | Start all services in watch mode     |
| `pnpm lint`      | ESLint across monorepo               |
| `pnpm typecheck` | TypeScript check all packages        |
| `pnpm test`      | Run unit tests (Vitest)              |
| `pnpm format`    | Prettier format                      |
| `pnpm db:up`     | Start Postgres + PgBouncer + Redis   |
| `pnpm db:migrate`| Apply Prisma migrations (direct URL) |
| `pnpm db:verify` | Migrate + verify pgvector via pool   |

## Database (E1.2)

- **PostgreSQL 16** with **pgvector** extension
- **PgBouncer** transaction pooling on port `6432`
- **Prisma Migrate** on direct port `5432` (`DATABASE_MIGRATE_URL`)
- Runtime apps use `DATABASE_POOL_URL` through PgBouncer

See [`packages/database/docs/migrations.md`](packages/database/docs/migrations.md) and [`packages/database/docs/connection-pooling.md`](packages/database/docs/connection-pooling.md).

## CI/CD

### Pull Request (`ci.yml`)

1. Install dependencies (pnpm, cached)
2. Lint → Typecheck → Unit tests → Build
3. PostgreSQL migrations + pgvector verification (Docker Compose)
4. Docker build verification (all 5 services, no push)

**Merge is blocked if any step fails** (configure branch protection on GitHub).

### Main branch deploy (`deploy.yml`)

1. Authenticate to AWS via OIDC (`AWS_ROLE_ARN` secret)
2. Build and push Docker images to ECR
3. Deploy to ECS with circuit breaker rollback
4. Wait for service stability + health check (API)

## AWS Setup (required for deploy)

Configure these **GitHub Secrets**:

| Secret           | Description                    |
|------------------|--------------------------------|
| `AWS_ROLE_ARN`   | IAM role for GitHub OIDC       |

Configure these **GitHub Variables**:

| Variable              | Description                          |
|-----------------------|--------------------------------------|
| `AWS_REGION`          | e.g. `us-east-1`                     |
| `ECS_CLUSTER_NAME`    | ECS cluster name                     |
| `ECS_SERVICE_PREFIX`  | e.g. `qa-automater`                  |
| `API_HEALTH_URL`      | Public API URL for post-deploy check |

Create ECR repositories:

- `qa-automater/api`
- `qa-automater/web`
- `qa-automater/scan-worker`
- `qa-automater/ai-worker`
- `qa-automater/export-worker`

## Environment Variables

See [`.env.example`](.env.example) for all variables.

## Docker

Build individual images from repository root:

```bash
docker build -f apps/api/Dockerfile -t qa-automater/api .
docker build -f apps/web/Dockerfile -t qa-automater/web .
docker build -f workers/scan/Dockerfile -t qa-automater/scan-worker .
docker build -f workers/ai/Dockerfile -t qa-automater/ai-worker .
docker build -f workers/export/Dockerfile -t qa-automater/export-worker .
```

## Story Reference

Implements **E1.1 — Initialize Monorepo and CI Pipeline** and **E1.2 — Provision PostgreSQL with pgvector Extension** (Epic E1: Platform Foundation).

## License

Proprietary — QA Automater
