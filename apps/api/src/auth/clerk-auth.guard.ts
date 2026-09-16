import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private jwtService?: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (process.env.DEV_AUTH_BYPASS === 'true') {
        request.user = {
          userId: 'user_dev_fallback',
          orgId: null,
          role: 'ADMIN',
          claims: { sub: 'user_dev_fallback' },
        };
        return true;
      }
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];

    try {
      if (this.jwtService) {
        const secret = process.env.JWT_SECRET || 'qa_automater_jwt_secret_key_2026';
        const payload = await this.jwtService.verifyAsync(token, { secret });
        request.user = {
          userId: payload.sub || payload.userId || 'user_dev_fallback',
          orgId: payload.orgId || null,
          role: payload.role || 'ADMIN',
          claims: payload,
        };
      } else {
        request.user = {
          userId: 'user_dev_fallback',
          orgId: null,
          role: 'ADMIN',
          claims: { sub: 'user_dev_fallback' },
        };
      }
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid token';
      throw new UnauthorizedException(`Unauthorized: ${message}`);
    }
  }
}
