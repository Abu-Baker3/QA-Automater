#!/usr/bin/env tsx
/**
 * E1.2 verification script — run after migrate:deploy
 * Usage: DATABASE_POOL_URL=... DATABASE_MIGRATE_URL=... pnpm verify
 */
import { execSync } from 'node:child_process';
import { createDatabasePool, loadDatabaseConfig, verifyPgvector } from '../pool';

const POSTGRES_MAX_CONNECTIONS = 100;
const PGBOUNCER_MAX_DB_CONNECTIONS = 40;

async function main() {
  const config = loadDatabaseConfig();
  process.env.DATABASE_MIGRATE_URL = config.migrateUrl;
  process.env.DATABASE_POOL_URL = config.poolUrl;

  console.log('[db:verify] migrate URL host:', maskUrl(config.migrateUrl));
  console.log('[db:verify] pool URL host:', maskUrl(config.poolUrl));

  if (!config.poolUrl.includes(':6432')) {
    throw new Error('AC2: DATABASE_POOL_URL must route through PgBouncer (port 6432)');
  }

  console.log('[db:verify] running prisma migrate deploy...');
  execSync('pnpm exec prisma migrate deploy', {
    stdio: 'inherit',
    env: process.env,
    cwd: process.cwd(),
  });

  const pool = createDatabasePool();
  try {
    console.log('[db:verify] verifying pgvector via pooled connection...');
    await verifyPgvector(pool);

    const budget = await checkConnectionBudget(pool);
    if (budget.activeConnections > POSTGRES_MAX_CONNECTIONS) {
      throw new Error(
        `Active connections (${budget.activeConnections}) exceed Postgres max_connections (${POSTGRES_MAX_CONNECTIONS})`,
      );
    }
    if (budget.activeConnections > PGBOUNCER_MAX_DB_CONNECTIONS) {
      throw new Error(
        `Active connections (${budget.activeConnections}) exceed PgBouncer max_db_connections (${PGBOUNCER_MAX_DB_CONNECTIONS})`,
      );
    }

    console.log('[db:verify] SUCCESS — pgvector available, migrations applied, pooling OK');
    console.log(`[db:verify] active connections: ${budget.activeConnections}`);
  } finally {
    await pool.end();
  }
}

async function checkConnectionBudget(pool: ReturnType<typeof createDatabasePool>) {
  const client = await pool.connect();
  try {
    const stats = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM pg_stat_activity WHERE datname = current_database()`,
    );
    return { activeConnections: Number(stats.rows[0]?.count ?? 0) };
  } finally {
    client.release();
  }
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.username ? '***@' : ''}${u.host}${u.pathname}`;
  } catch {
    return '(invalid url)';
  }
}

main().catch((err) => {
  console.error('[db:verify] FAILED:', err);
  process.exit(1);
});
