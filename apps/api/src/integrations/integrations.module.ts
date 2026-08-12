import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { GitHubIntegrationService } from './github-integration.service';
import { SecretsManagerService } from './secrets-manager.service';

@Module({
  controllers: [IntegrationsController],
  providers: [GitHubIntegrationService, SecretsManagerService],
  exports: [GitHubIntegrationService, SecretsManagerService],
})
export class IntegrationsModule {}
