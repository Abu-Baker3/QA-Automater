import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAtMs: number;
  retryAfterSeconds: number;
}

@Injectable()
export class RateLimiterService {
  private userRequests = new Map<string, number[]>();
  private orgGenerationJobs = new Map<string, number[]>();

  /**
   * Story E14.1 AC2: Given API calls When >100 req/min/user Then 429 with Retry-After header
   */
  checkUserRateLimit(userId: string, maxRequestsPerMinute: number = 100): RateLimitResult {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const windowStart = now - windowMs;

    const timestamps = (this.userRequests.get(userId) || []).filter((ts) => ts > windowStart);

    if (timestamps.length >= maxRequestsPerMinute) {
      const oldestInWindow = timestamps[0] ?? windowStart;
      const retryAfterSeconds = Math.max(1, Math.ceil((oldestInWindow + windowMs - now) / 1000));

      return {
        allowed: false,
        limit: maxRequestsPerMinute,
        remaining: 0,
        resetAtMs: oldestInWindow + windowMs,
        retryAfterSeconds,
      };
    }

    timestamps.push(now);
    this.userRequests.set(userId, timestamps);

    return {
      allowed: true,
      limit: maxRequestsPerMinute,
      remaining: Math.max(0, maxRequestsPerMinute - timestamps.length),
      resetAtMs: now + windowMs,
      retryAfterSeconds: 0,
    };
  }

  /**
   * Story E14.1 AC1: Given free tier When >10 generation jobs/hour Then 429 returned
   */
  checkOrgGenerationLimit(
    orgId: string,
    tier: string = 'FREE',
    maxJobsPerHourFree: number = 10,
  ): RateLimitResult {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    const windowStart = now - windowMs;

    const maxJobs = tier.toUpperCase() === 'FREE' ? maxJobsPerHourFree : 100;
    const timestamps = (this.orgGenerationJobs.get(orgId) || []).filter((ts) => ts > windowStart);

    if (timestamps.length >= maxJobs) {
      const oldestInWindow = timestamps[0] ?? windowStart;
      const retryAfterSeconds = Math.max(1, Math.ceil((oldestInWindow + windowMs - now) / 1000));

      return {
        allowed: false,
        limit: maxJobs,
        remaining: 0,
        resetAtMs: oldestInWindow + windowMs,
        retryAfterSeconds,
      };
    }

    timestamps.push(now);
    this.orgGenerationJobs.set(orgId, timestamps);

    return {
      allowed: true,
      limit: maxJobs,
      remaining: Math.max(0, maxJobs - timestamps.length),
      resetAtMs: now + windowMs,
      retryAfterSeconds: 0,
    };
  }

  /**
   * Enforce user rate limit or throw 429 HttpException with Retry-After header info
   */
  enforceUserRateLimit(userId: string, maxRequestsPerMinute: number = 100): void {
    const result = this.checkUserRateLimit(userId, maxRequestsPerMinute);
    if (!result.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too Many Requests: Rate limit of ${maxRequestsPerMinute} requests per minute exceeded.`,
          retryAfter: result.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Enforce org generation job rate limit or throw 429 HttpException
   */
  enforceOrgGenerationLimit(
    orgId: string,
    tier: string = 'FREE',
    maxJobsPerHourFree: number = 10,
  ): void {
    const result = this.checkOrgGenerationLimit(orgId, tier, maxJobsPerHourFree);
    if (!result.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Organization free tier rate limit exceeded: Maximum ${maxJobsPerHourFree} generation jobs per hour.`,
          retryAfter: result.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Reset store (useful for unit tests and administration)
   */
  reset(): void {
    this.userRequests.clear();
    this.orgGenerationJobs.clear();
  }
}
