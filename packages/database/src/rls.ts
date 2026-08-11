export interface TenantRow {
  id: string;
  organizationId: string;
  [key: string]: unknown;
}

export async function setOrgContext(
  client: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
  orgId: string | null,
): Promise<void> {
  if (!orgId) {
    await client.query(`SELECT set_config('app.current_org_id', '', true);`);
    return;
  }
  await client.query(`SELECT set_config('app.current_org_id', $1, true);`, [orgId]);
}

export function filterRowsByOrgContext<T extends TenantRow>(
  rows: T[],
  currentOrgId: string | null,
): T[] {
  if (!currentOrgId) {
    return [];
  }
  return rows.filter((row) => row.organizationId === currentOrgId);
}
