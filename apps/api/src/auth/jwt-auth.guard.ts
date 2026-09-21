import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (request.cookies && request.cookies.access_token) {
      token = request.cookies.access_token;
    }

    if (!token) {
      if (process.env.DEV_AUTH_BYPASS === 'true') {
        request.user = {
          userId: 'user_dev_fallback',
          email: 'dev@qaautomater.local',
          orgId: 'org_default',
          role: 'ADMIN',
        };
        return true;
      }
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    try {
      const secret = process.env.JWT_SECRET || 'qa_automater_jwt_secret_key_2026';
      const payload = await this.jwtService.verifyAsync(token, { secret });
      request.user = {
        userId: payload.sub || payload.userId,
        email: payload.email,
        orgId: payload.orgId || null,
        role: payload.role || 'MEMBER',
        claims: payload,
      };
      return true;
    } catch (err: unknown) {
      if (process.env.DEV_AUTH_BYPASS === 'true') {
        request.user = {
          userId: 'user_dev_fallback',
          email: 'dev@qaautomater.local',
          orgId: 'org_default',
          role: 'ADMIN',
        };
        return true;
      }
      const message = err instanceof Error ? err.message : 'Invalid token';
      throw new UnauthorizedException(`Unauthorized: ${message}`);
    }
  }
}
