import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';

export interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    first_name?: string;
    last_name?: string;
  };
}

@Controller('webhooks')
export class WebhooksController {
  @Post('clerk')
  @HttpCode(HttpStatus.OK)
  handleClerkWebhook(@Body() event: ClerkWebhookEvent) {
    if (!event || !event.type) {
      return { status: 'ignored', reason: 'Invalid event format' };
    }

    switch (event.type) {
      case 'user.created':
      case 'user.updated':
        return {
          status: 'success',
          syncedUserId: event.data.id,
          email: event.data.email_addresses?.[0]?.email_address || null,
        };
      default:
        return { status: 'ignored', eventType: event.type };
    }
  }
}
