import { describe, expect, it, beforeEach } from 'vitest';
import { HttpException, HttpStatus, ExecutionContext } from '@nestjs/common';
import { RateLimiterService } from './rate-limiter.service';
import { RateLimitGuard } from './rate-limit.guard';

describe('RateLimiterService (Story E14.1 AC1 & AC2)', () => {
  let rateLimiter: RateLimiterService;

  beforeEach(() => {
    rateLimiter = new RateLimiterService();
    rateLimiter.reset();
  });

  describe('User API Rate Limiting (AC2: >100 req/min/user -> 429 with Retry-After header)', () => {
    it('allows up to 100 requests per minute for a user', () => {
      const userId = 'user_test_100';

      for (let i = 0; i < 100; i++) {
        const res = rateLimiter.checkUserRateLimit(userId, 100);
        expect(res.allowed).toBe(true);
        expect(res.limit).toBe(100);
      }
    });

    it('rejects the 101st request within 1 minute with allowed: false and retryAfterSeconds > 0', () => {
      const userId = 'user_test_overflow';

      for (let i = 0; i < 100; i++) {
        rateLimiter.checkUserRateLimit(userId, 100);
      }

      const overflowRes = rateLimiter.checkUserRateLimit(userId, 100);
      expect(overflowRes.allowed).toBe(false);
      expect(overflowRes.remaining).toBe(0);
      expect(overflowRes.retryAfterSeconds).toBeGreaterThan(0);
      expect(overflowRes.retryAfterSeconds).toBeLessThanOrEqual(60);
    });

    it('enforceUserRateLimit throws HttpException with 429 status on limit breach', () => {
      const userId = 'user_test_throw';

      for (let i = 0; i < 100; i++) {
        rateLimiter.checkUserRateLimit(userId, 100);
      }

      expect(() => {
        rateLimiter.enforceUserRateLimit(userId, 100);
      }).toThrowError(HttpException);

      try {
        rateLimiter.enforceUserRateLimit(userId, 100);
      } catch (err: unknown) {
        const httpErr = err as HttpException;
        expect(httpErr.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const response = httpErr.getResponse() as Record<string, unknown>;
        expect(response.statusCode).toBe(429);
        expect(response.retryAfter).toBeDefined();
      }
    });
  });

  describe('Organization Generation Job Limits (AC1: Free tier >10 generation jobs/hour -> 429)', () => {
    it('allows up to 10 generation jobs per hour on free tier', () => {
      const orgId = 'org_free_tier_1';

      for (let i = 0; i < 10; i++) {
        const res = rateLimiter.checkOrgGenerationLimit(orgId, 'FREE', 10);
        expect(res.allowed).toBe(true);
        expect(res.limit).toBe(10);
      }
    });

    it('rejects the 11th generation job within 1 hour for free tier with 429', () => {
      const orgId = 'org_free_tier_overflow';

      for (let i = 0; i < 10; i++) {
        rateLimiter.checkOrgGenerationLimit(orgId, 'FREE', 10);
      }

      const overflowRes = rateLimiter.checkOrgGenerationLimit(orgId, 'FREE', 10);
      expect(overflowRes.allowed).toBe(false);
      expect(overflowRes.remaining).toBe(0);
      expect(overflowRes.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('enforceOrgGenerationLimit throws HttpException with 429 when free tier limit is exceeded', () => {
      const orgId = 'org_free_throw';

      for (let i = 0; i < 10; i++) {
        rateLimiter.checkOrgGenerationLimit(orgId, 'FREE', 10);
      }

      expect(() => {
        rateLimiter.enforceOrgGenerationLimit(orgId, 'FREE', 10);
      }).toThrowError(HttpException);

      try {
        rateLimiter.enforceOrgGenerationLimit(orgId, 'FREE', 10);
      } catch (err: unknown) {
        const httpErr = err as HttpException;
        expect(httpErr.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const response = httpErr.getResponse() as Record<string, unknown>;
        expect(response.message).toContain('Maximum 10 generation jobs per hour');
      }
    });

    it('allows paid/enterprise tiers to exceed free tier limit', () => {
      const orgId = 'org_enterprise_tier';

      for (let i = 0; i < 15; i++) {
        const res = rateLimiter.checkOrgGenerationLimit(orgId, 'ENTERPRISE', 10);
        expect(res.allowed).toBe(true);
      }
    });
  });

  describe('RateLimitGuard (AC2)', () => {
    it('sets rate limit headers and passes for normal request volumes', () => {
      const guard = new RateLimitGuard(rateLimiter);
      const headers: Record<string, string> = {};

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user_guard_test' },
            ip: '127.0.0.1',
          }),
          getResponse: () => ({
            setHeader: (key: string, val: string) => {
              headers[key] = val;
            },
          }),
        }),
      } as unknown as ExecutionContext;

      const canActivate = guard.canActivate(mockContext);
      expect(canActivate).toBe(true);
      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBeDefined();
    });

    it('sets Retry-After header and throws 429 when user rate limit is exceeded', () => {
      const guard = new RateLimitGuard(rateLimiter);
      const headers: Record<string, string> = {};
      const userId = 'user_guard_burst';

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: userId },
            ip: '127.0.0.1',
          }),
          getResponse: () => ({
            setHeader: (key: string, val: string) => {
              headers[key] = val;
            },
          }),
        }),
      } as unknown as ExecutionContext;

      // Exhaust 100 requests
      for (let i = 0; i < 100; i++) {
        guard.canActivate(mockContext);
      }

      // 101st request should set Retry-After and throw 429
      expect(() => {
        guard.canActivate(mockContext);
      }).toThrowError(HttpException);

      expect(headers['Retry-After']).toBeDefined();
      expect(parseInt(headers['Retry-After'] || '0', 10)).toBeGreaterThan(0);
    });
  });
});
