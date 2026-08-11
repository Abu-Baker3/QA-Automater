import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { setOrgContext } from '@qa-automater/database';
import { DatabaseService } from './database.service';

@Injectable()
export class RlsInterceptor implements NestInterceptor {
  constructor(private readonly dbService: DatabaseService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const orgId =
      (request.headers?.['x-organization-id'] as string) ||
      request.user?.orgId ||
      null;

    await this.dbService.withClient(async (client: unknown) => {
      await setOrgContext(client as { query: (sql: string, params?: unknown[]) => Promise<unknown> }, orgId);
    });

    return next.handle();
  }
}
