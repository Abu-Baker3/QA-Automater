# Row-Level Security (RLS) Scaffold — E1.2

Business RLS policies are **not enabled** in E1.2. This document defines the pattern for **E2.4**.

## Session context

Applications set tenant context per request:

```sql
SELECT app.set_org_context('00000000-0000-0000-0000-000000000001'::uuid);
```

Read current org:

```sql
SELECT app.current_org_id();
```

## Policy template (future tables)

When creating tenant-scoped tables in E2+:

```sql
ALTER TABLE public.{table_name} ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.{table_name} FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON public.{table_name}
  FOR SELECT
  USING (org_id = app.current_org_id());

CREATE POLICY tenant_isolation_modify ON public.{table_name}
  FOR ALL
  USING (org_id = app.current_org_id())
  WITH CHECK (org_id = app.current_org_id());
```

Templates are stored in `app.rls_scaffold` with `enabled = false`.

## NestJS integration (E2.4)

Middleware will call `SET LOCAL app.org_id` via `app.set_org_context()` after JWT validation.
