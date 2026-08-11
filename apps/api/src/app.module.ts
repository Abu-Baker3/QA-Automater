import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { OrganizationsModule } from './organizations/organizations.module';
import { QueueModule } from './queue/queue.module';
import { RepositoriesModule } from './repositories/repositories.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    DatabaseModule,
    QueueModule,
    StorageModule,
    AuthModule,
    OrganizationsModule,
    RepositoriesModule,
  ],
  controllers: [AppController, HealthController],
})
export class AppModule {}



