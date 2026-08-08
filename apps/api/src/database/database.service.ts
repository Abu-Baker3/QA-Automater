import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  checkDatabaseHealth,
  createDatabasePool,
  loadDatabaseConfig,
  verifyPgvector,
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
    await verifyPgvector(this.pool);
  }

  async checkHealth() {
    return checkDatabaseHealth(this.pool);
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
