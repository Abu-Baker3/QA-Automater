import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RateLimiterService } from './rate-limiter.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly rateLimiterService: RateLimiterService) {}

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    // Extract user ID from auth context or fallback to IP / client identifier
    const user = (req as unknown as { user?: { id?: string; sub?: string } }).user;
    const identifier = user?.id || user?.sub || req.ip || 'anonymous-client';

    const result = this.rateLimiterService.checkUserRateLimit(identifier, 100);

    // Set standard rate limit headers
    if (res && res.setHeader) {
      res.setHeader('X-RateLimit-Limit', result.limit.toString());
      res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAtMs / 1000).toString());
    }

    // Story E14.1 AC2: When >100 req/min/user Then 429 with Retry-After header
    if (!result.allowed) {
      if (res && res.setHeader) {
        res.setHeader('Retry-After', result.retryAfterSeconds.toString());
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too Many Requests: Rate limit of 100 requests per minute exceeded.',
          retryAfter: result.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
