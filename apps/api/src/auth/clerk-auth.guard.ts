import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyToken } from '@clerk/backend';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];

    try {
      const secretKey = process.env.CLERK_SECRET_KEY;
      if (secretKey) {
        const payload = await verifyToken(token, { secretKey });
        request.user = { userId: payload.sub, claims: payload };
      } else {
        // Dev fallback mode when CLERK_SECRET_KEY is not provided
        request.user = { userId: 'user_dev_fallback', claims: { sub: 'user_dev_fallback' } };
      }
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid token';
      throw new UnauthorizedException(`Unauthorized: ${message}`);
    }
  }
}
