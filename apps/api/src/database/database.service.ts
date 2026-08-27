import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  checkDatabaseHealth,
  createDatabasePool,
  loadDatabaseConfig,
  verifyPgvector,
  withClient,
} from '@qa-automater/database';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: ReturnType<typeof createDatabasePool>;

  constructor() {
    this.pool = createDatabasePool();
  }

  getPool(): ReturnType<typeof createDatabasePool> {
    return this.pool;
  }

  getConfig() {
    return loadDatabaseConfig();
  }

  async onModuleInit(): Promise<void> {
    if (process.env.DATABASE_SKIP_STARTUP_VERIFY === 'true') {
      return;
    }
    try {
      await verifyPgvector(this.pool);
    } catch {
      console.warn(
        '[DatabaseService] Database connection unverified on startup (Docker/PostgreSQL offline). Server booting in local dev mode.',
      );
    }

  }

  async checkHealth() {
    return checkDatabaseHealth(this.pool);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async withClient<T>(fn: (client: any) => Promise<T>): Promise<T> {
    return withClient(this.pool, fn);
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
