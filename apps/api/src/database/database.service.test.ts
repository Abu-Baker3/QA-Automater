import { describe, expect, it } from 'vitest';
import { loadDatabaseConfig } from '@qa-automater/database';

describe('DatabaseService configuration', () => {
  it('routes runtime connections through PgBouncer port by default', () => {
    const config = loadDatabaseConfig();
    expect(config.poolUrl).toContain(':6432');
    expect(config.migrateUrl).toContain(':5432');
    expect(config.maxConnections).toBeGreaterThan(0);
  });
});
