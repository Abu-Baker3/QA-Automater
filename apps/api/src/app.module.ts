import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { EventsModule } from './events/events.module';
import { HealthController } from './health.controller';
import { IntegrationsModule } from './integrations/integrations.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { QueueModule } from './queue/queue.module';
import { RepositoriesModule } from './repositories/repositories.module';
import { ScansModule } from './scans/scans.module';
import { StorageModule } from './storage/storage.module';
import { TestsModule } from './tests/tests.module';

@Module({
  imports: [
    DatabaseModule,
    EventsModule,
    QueueModule,
    StorageModule,
    AuthModule,
    OrganizationsModule,
    RepositoriesModule,
    IntegrationsModule,
    ScansModule,
    TestsModule,
  ],

  controllers: [AppController, HealthController],
})
export class AppModule {}
