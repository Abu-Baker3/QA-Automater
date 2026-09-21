import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from './auth.service';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';

describe('AuthService (Authentication & Security)', () => {
  let authService: AuthService;
  let mockDbService: DatabaseService;
  let jwtService: JwtService;

  beforeEach(() => {
    mockDbService = {
      withClient: async (
        cb: (client: {
          query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
        }) => unknown,
      ) => {
        return cb({
          query: async () => ({ rows: [] }),
        });
      },
    } as unknown as DatabaseService;

    jwtService = new JwtService({ secret: 'test_jwt_secret' });
    authService = new AuthService(mockDbService, jwtService);
  });

  it('allows a user to sign up and then log in with correct credentials', async () => {
    const uniqueEmail = `testuser_${Date.now()}_${Math.random().toString(36).substring(7)}@qaautomater.local`;
    const signupData = {
      email: uniqueEmail,
      password: 'CorrectPassword123!',
      firstName: 'Test',
      lastName: 'User',
    };

    const signupResult = await authService.signup(signupData);
    expect(signupResult.user.email).toBe(uniqueEmail.toLowerCase());
    expect(signupResult.accessToken).toBeDefined();

    const loginResult = await authService.login({
      email: uniqueEmail,
      password: 'CorrectPassword123!',
    });

    expect(loginResult.user.email).toBe(uniqueEmail.toLowerCase());
    expect(loginResult.accessToken).toBeDefined();
  });

  it('rejects login with an incorrect password and throws UnauthorizedException', async () => {
    const uniqueEmail = `testuser2_${Date.now()}_${Math.random().toString(36).substring(7)}@qaautomater.local`;
    await authService.signup({
      email: uniqueEmail,
      password: 'MySecretPassword123!',
      firstName: 'Alice',
      lastName: 'Smith',
    });

    await expect(
      authService.login({
        email: uniqueEmail,
        password: 'WrongPassword!',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects login for non-existent users and throws UnauthorizedException', async () => {
    const uniqueEmail = `nonexistent_${Date.now()}_${Math.random().toString(36).substring(7)}@qaautomater.local`;
    await expect(
      authService.login({
        email: uniqueEmail,
        password: 'SomePassword123!',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('prevents duplicate user registration on signup', async () => {
    const uniqueEmail = `duplicate_${Date.now()}_${Math.random().toString(36).substring(7)}@qaautomater.local`;
    await authService.signup({
      email: uniqueEmail,
      password: 'Password123!',
    });

    await expect(
      authService.signup({
        email: uniqueEmail,
        password: 'Password123!',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
