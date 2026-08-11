import { describe, it, expect, vi } from 'vitest';
import { setOrgContext, filterRowsByOrgContext, TenantRow } from './rls';

describe('PostgreSQL Row-Level Security (RLS) Helper', () => {
  it('should set_config for app.current_org_id', async () => {
    const mockClient = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    await setOrgContext(mockClient, 'org_123');

    expect(mockClient.query).toHaveBeenCalledWith(
      `SELECT set_config('app.current_org_id', $1, true);`,
      ['org_123'],
    );
  });

  it('AC1: should return zero rows when querying without org context', () => {
    const sampleData: TenantRow[] = [
      { id: '1', organizationId: 'org_123', name: 'Repo A' },
      { id: '2', organizationId: 'org_456', name: 'Repo B' },
    ];

    const result = filterRowsByOrgContext(sampleData, null);
    expect(result).toHaveLength(0);
  });

  it('AC2: should return only matching org rows when querying with org context', () => {
    const sampleData: TenantRow[] = [
      { id: '1', organizationId: 'org_123', name: 'Repo A' },
      { id: '2', organizationId: 'org_456', name: 'Repo B' },
      { id: '3', organizationId: 'org_123', name: 'Repo C' },
    ];

    const result = filterRowsByOrgContext(sampleData, 'org_123');
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual(['1', '3']);
  });
});
