import { describe, it, expect } from 'vitest';
import { WebhooksController, ClerkWebhookEvent } from './webhooks.controller';

describe('WebhooksController', () => {
  const controller = new WebhooksController();

  it('should handle user.created webhook event', () => {
    const payload: ClerkWebhookEvent = {
      type: 'user.created',
      data: {
        id: 'user_12345',
        email_addresses: [{ email_address: 'user@example.com' }],
      },
    };

    const res = controller.handleClerkWebhook(payload);
    expect(res).toEqual({
      status: 'success',
      syncedUserId: 'user_12345',
      email: 'user@example.com',
    });
  });

  it('should ignore unrecognized event types', () => {
    const payload: ClerkWebhookEvent = {
      type: 'session.created',
      data: { id: 'sess_999' },
    };

    const res = controller.handleClerkWebhook(payload);
    expect(res.status).toBe('ignored');
  });
});
