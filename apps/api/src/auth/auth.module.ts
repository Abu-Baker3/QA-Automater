import { Module } from '@nestjs/common';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { WebhooksController } from './webhooks.controller';

@Module({
  controllers: [WebhooksController],
  providers: [ClerkAuthGuard],
  exports: [ClerkAuthGuard],
})
export class AuthModule {}
