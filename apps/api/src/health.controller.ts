import { Controller, Get } from '@nestjs/common';
import { createHealthResponse } from '@qa-automater/shared';
import type { HealthStatus } from '@qa-automater/types';
import { DatabaseService } from './database/database.service';
import { QueueService } from './queue/queue.service';
import { StorageService } from './storage/storage.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  async check() {
    const db = await this.databaseService.checkHealth();
    const queue = await this.queueService.checkHealth();
    const storage = await this.storageService.checkHealth();

    const allOk = db.ok && queue.ok && storage.ok;
    const status: HealthStatus = allOk ? 'ok' : 'degraded';

    return {
      ...createHealthResponse('api', process.env.npm_package_version ?? '0.1.0', status),
      database: {
        ok: db.ok,
        pgvector: db.pgvector,
        latencyMs: db.latencyMs,
        activeConnections: db.activeConnections,
        pooled: this.databaseService.getConfig().poolUrl.includes(':6432'),
      },
      queue,
      storage,
    };
  }
}
