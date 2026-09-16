import { describe, it, expect, vi } from 'vitest';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('JwtAuthGuard', () => {
  const mockJwtService: any = {
    verifyAsync: vi.fn(),
  };

  const guard = new JwtAuthGuard(mockJwtService);

  it('should pass with valid bearer token', async () => {
    mockJwtService.verifyAsync.mockResolvedValueOnce({
      sub: 'usr_123',
      email: 'user@qaautomater.local',
      orgId: 'org_123',
      role: 'ADMIN',
    });

    const mockRequest: any = {
      headers: { authorization: 'Bearer valid_jwt_token' },
    };

    const mockContext: any = {
      switchToHttp: () => ({ getRequest: () => mockRequest }),
    };

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
    expect(mockRequest.user).toEqual({
      userId: 'usr_123',
      email: 'user@qaautomater.local',
      orgId: 'org_123',
      role: 'ADMIN',
      claims: expect.anything(),
    });
  });

  it('should throw UnauthorizedException when token is missing', async () => {
    const mockRequest: any = { headers: {} };
    const mockContext: any = {
      switchToHttp: () => ({ getRequest: () => mockRequest }),
    };

    await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
  });
});
