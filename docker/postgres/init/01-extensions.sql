-- Bootstrap extensions on first container start (idempotent).
-- Prisma migrations also enable pgvector; this ensures extension exists pre-migrate.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
