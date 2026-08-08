-- E1.2: Initial database foundation — pgvector, RLS scaffold, health verification table

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS app;

-- Session context helpers for future Row-Level Security (activated in E2.4)
CREATE OR REPLACE FUNCTION app.set_org_context(org_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('app.org_id', org_id::text, true);
END;
$$;

CREATE OR REPLACE FUNCTION app.current_org_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN NULLIF(current_setting('app.org_id', true), '')::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION app.set_org_context IS 'Sets tenant org_id for RLS policies (E2.4).';
COMMENT ON FUNCTION app.current_org_id IS 'Reads tenant org_id from session (E2.4).';

-- Placeholder documenting RLS policy pattern (no business tables yet)
CREATE TABLE IF NOT EXISTS app.rls_scaffold (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name text NOT NULL,
  target_table text NOT NULL,
  policy_sql text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE app.rls_scaffold IS
  'E1.2 RLS policy templates. enabled=false until E2.4 activates tenant policies.';

INSERT INTO app.rls_scaffold (policy_name, target_table, policy_sql, enabled)
SELECT
  'tenant_isolation_template',
  '{table_name}',
  'USING (org_id = app.current_org_id())',
  false
WHERE NOT EXISTS (
  SELECT 1 FROM app.rls_scaffold WHERE policy_name = 'tenant_isolation_template'
);

-- pgvector verification + future embedding dimension check (1536 per architecture)
CREATE TABLE IF NOT EXISTS app.pgvector_health_check (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  embedding vector(1536),
  checked_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE app.pgvector_health_check IS
  'Used by E1.2 verify script and health checks to confirm vector type availability.';

-- Prisma-managed _schema_meta
CREATE TABLE IF NOT EXISTS "_schema_meta" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version varchar(50) NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO "_schema_meta" (version)
SELECT 'E1.2-init'
WHERE NOT EXISTS (SELECT 1 FROM "_schema_meta" WHERE version = 'E1.2-init');

-- Fail fast if pgvector unavailable
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RAISE EXCEPTION 'pgvector extension is not installed';
  END IF;
END $$;
