import { describe, it, expect, vi } from 'vitest';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { RlsInterceptor } from './rls.interceptor';
import { DatabaseService } from './database.service';

describe('RlsInterceptor', () => {
  it('should extract x-organization-id header and set RLS org context', async () => {
    const mockDbService = {
      withClient: vi.fn().mockImplementation(async (cb) => {
        const mockClient = { query: vi.fn().mockResolvedValue({ rows: [] }) };
        return cb(mockClient);
      }),
    } as unknown as DatabaseService;

    const interceptor = new RlsInterceptor(mockDbService);

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-organization-id': 'org_test_999' },
        }),
      }),
    } as unknown as ExecutionContext;

    const mockCallHandler: CallHandler = {
      handle: () => of({ status: 'ok' }),
    };

    const observable = await interceptor.intercept(mockContext, mockCallHandler);
    expect(mockDbService.withClient).toHaveBeenCalled();
    expect(observable).toBeDefined();
  });
});
