import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [DatabaseModule, QueueModule, StorageModule],
  controllers: [AppController, HealthController],
})
export class AppModule {}
