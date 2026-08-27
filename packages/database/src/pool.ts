import type { Pool, PoolClient, PoolConfig } from 'pg';
import { Pool as PgPool } from 'pg';
import { getEnvOrThrow } from '@qa-automater/shared';

export interface DatabasePoolConfig {
  /** Pooled URL (PgBouncer) for application runtime */
  poolUrl: string;
  /** Direct Postgres URL for migrations/admin */
  migrateUrl: string;
  maxConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
}

const DEFAULT_POOL_URL = 'postgresql://postgres:postgres@localhost:6432/qa_automater';
const DEFAULT_MIGRATE_URL = 'postgresql://postgres:postgres@localhost:5432/qa_automater';

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function resolvePoolUrl(): string {
  if (process.env.DATABASE_POOL_URL) {
    return process.env.DATABASE_POOL_URL;
  }
  const legacyUrl = process.env.DATABASE_URL;
  if (legacyUrl?.includes(':6432')) {
    return legacyUrl;
  }
  return DEFAULT_POOL_URL;
}

function resolveMigrateUrl(): string {
  if (process.env.DATABASE_MIGRATE_URL) {
    return process.env.DATABASE_MIGRATE_URL;
  }
  const legacyUrl = process.env.DATABASE_URL;
  // Do not route migrations through PgBouncer when only DATABASE_URL is set.
  if (legacyUrl && !legacyUrl.includes(':6432')) {
    return legacyUrl;
  }
  return DEFAULT_MIGRATE_URL;
}

export function loadDatabaseConfig(): DatabasePoolConfig {
  return {
    poolUrl: resolvePoolUrl(),
    migrateUrl: resolveMigrateUrl(),
    maxConnections: parsePositiveInt(process.env.DATABASE_POOL_MAX, 10),
    idleTimeoutMs: parsePositiveInt(process.env.DATABASE_IDLE_TIMEOUT_MS, 30000),
    connectionTimeoutMs: parsePositiveInt(process.env.DATABASE_CONNECT_TIMEOUT_MS, 5000),
  };
}

export function createDatabasePool(config?: Partial<DatabasePoolConfig>): Pool {
  const resolved = { ...loadDatabaseConfig(), ...config };
  const poolConfig: PoolConfig = {
    connectionString: resolved.poolUrl,
    max: resolved.maxConnections,
    idleTimeoutMillis: resolved.idleTimeoutMs,
    connectionTimeoutMillis: resolved.connectionTimeoutMs,
  };

  return new PgPool(poolConfig);
}

export async function withClient<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function checkDatabaseHealth(pool: Pool): Promise<{
  ok: boolean;
  pgvector: boolean;
  latencyMs: number;
  activeConnections?: number;
}> {
  const start = Date.now();
  const timeoutPromise = new Promise<{
    ok: boolean;
    pgvector: boolean;
    latencyMs: number;
    activeConnections?: number;
  }>((resolve) =>
    setTimeout(
      () =>
        resolve({
          ok: false,
          pgvector: false,
          latencyMs: Date.now() - start,
        }),
      2000,
    ),
  );

  const checkPromise = (async () => {
    try {
      const result = await withClient(pool, async (client) => {
        const health = await client.query<{ ok: number }>('SELECT 1 AS ok');
        const ext = await client.query<{ exists: boolean }>(
          `SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS exists`,
        );
        let activeConnections: number | undefined;
        try {
          const stats = await client.query<{ count: string }>(
            `SELECT count(*)::text AS count FROM pg_stat_activity WHERE datname = current_database()`,
          );
          activeConnections = Number(stats.rows[0]?.count ?? 0);
        } catch {
          activeConnections = undefined;
        }
        return {
          ok: health.rows[0]?.ok === 1,
          pgvector: ext.rows[0]?.exists === true,
          activeConnections,
        };
      });

      return {
        ...result,
        latencyMs: Date.now() - start,
      };
    } catch {
      return {
        ok: false,
        pgvector: false,
        latencyMs: Date.now() - start,
      };
    }
  })();

  return Promise.race([checkPromise, timeoutPromise]);
}


export async function verifyPgvector(pool: Pool): Promise<void> {
  await withClient(pool, async (client) => {
    const ext = await client.query(
      `SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'`,
    );
    if (ext.rowCount === 0) {
      throw new Error('pgvector extension is not installed');
    }

    await client.query(`SELECT $1::vector(3) AS probe`, ['[1,2,3]']);

    await client.query(
      `SELECT array_agg(0::float4)::vector(1536) AS probe_1536
       FROM generate_series(1, 1536)`,
    );
  });
}

export function requireMigrateUrl(): string {
  return getEnvOrThrow('DATABASE_MIGRATE_URL');
}
