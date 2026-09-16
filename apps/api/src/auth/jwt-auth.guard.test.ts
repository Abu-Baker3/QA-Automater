import { describe, it, expect, vi } from 'vitest';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

describe('JwtAuthGuard', () => {
  const mockJwtService = {
    verifyAsync: vi.fn(),
  } as unknown as JwtService;

  const guard = new JwtAuthGuard(mockJwtService);

  it('should pass with valid bearer token', async () => {
    vi.mocked(mockJwtService.verifyAsync).mockResolvedValueOnce({
      sub: 'usr_123',
      email: 'user@qaautomater.local',
      orgId: 'org_123',
      role: 'ADMIN',
    });

    const mockRequest: Record<string, unknown> = {
      headers: { authorization: 'Bearer valid_jwt_token' },
    };

    const mockContext = {
      switchToHttp: () => ({ getRequest: () => mockRequest }),
    } as unknown as ExecutionContext;

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
    const mockRequest: Record<string, unknown> = { headers: {} };
    const mockContext = {
      switchToHttp: () => ({ getRequest: () => mockRequest }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
  });
});
