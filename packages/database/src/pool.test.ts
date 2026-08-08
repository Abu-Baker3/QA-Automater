import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { loadDatabaseConfig } from './pool';

describe('@qa-automater/database config', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  it('loads pool and migrate URLs from environment', () => {
    process.env.DATABASE_POOL_URL = 'postgresql://u:p@pgbouncer:6432/qa_automater';
    process.env.DATABASE_MIGRATE_URL = 'postgresql://u:p@postgres:5432/qa_automater';
    process.env.DATABASE_POOL_MAX = '8';

    const config = loadDatabaseConfig();
    expect(config.poolUrl).toContain('6432');
    expect(config.migrateUrl).toContain('5432');
    expect(config.maxConnections).toBe(8);
  });

  it('defaults to local docker compose URLs', () => {
    delete process.env.DATABASE_POOL_URL;
    delete process.env.DATABASE_MIGRATE_URL;
    delete process.env.DATABASE_URL;

    const config = loadDatabaseConfig();
    expect(config.poolUrl).toContain('6432');
    expect(config.migrateUrl).toContain('5432');
  });

  it('does not route migrations through DATABASE_URL when it points at PgBouncer', () => {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:6432/qa_automater';
    delete process.env.DATABASE_POOL_URL;
    delete process.env.DATABASE_MIGRATE_URL;

    const config = loadDatabaseConfig();
    expect(config.poolUrl).toContain('6432');
    expect(config.migrateUrl).toContain('5432');
    expect(config.migrateUrl).not.toContain('6432');
  });

  it('falls back to defaults for invalid numeric pool settings', () => {
    process.env.DATABASE_POOL_MAX = 'abc';
    process.env.DATABASE_IDLE_TIMEOUT_MS = '-1';
    process.env.DATABASE_CONNECT_TIMEOUT_MS = '0';

    const config = loadDatabaseConfig();
    expect(config.maxConnections).toBe(10);
    expect(config.idleTimeoutMs).toBe(30000);
    expect(config.connectionTimeoutMs).toBe(5000);
  });
});
