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
import { TestsModule } from './tests/tests.module';
import { ElementsModule } from './elements/elements.module';
import { StoriesModule } from './stories/stories.module';
import { LlmModule } from './llm/llm.module';
import { RateLimitingModule } from './rate-limiting/rate-limiting.module';

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
    ElementsModule,
    StoriesModule,
    LlmModule,
    RateLimitingModule,
  ],

  controllers: [AppController, HealthController],
})
export class AppModule {}
