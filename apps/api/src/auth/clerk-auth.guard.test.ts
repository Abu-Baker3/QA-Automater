import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ClerkAuthGuard } from './clerk-auth.guard';

describe('ClerkAuthGuard', () => {
  let guard: ClerkAuthGuard;

  beforeEach(() => {
    guard = new ClerkAuthGuard();
    vi.restoreAllMocks();
  });

  it('should throw UnauthorizedException if Authorization header is missing', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
  });

  it('should extract user_id in dev fallback mode when CLERK_SECRET_KEY is absent', async () => {
    delete process.env.CLERK_SECRET_KEY;
    const request = { headers: { authorization: 'Bearer mock_dev_token' }, user: undefined };
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
    expect(request.user).toBeDefined();
    expect((request.user as unknown as { userId: string }).userId).toBe('user_dev_fallback');
  });
});
