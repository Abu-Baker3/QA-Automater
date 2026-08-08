import { describe, expect, it } from 'vitest';
import { StorageService } from './storage.service';

describe('StorageService in API app', () => {
  it('builds keys enforcing org_id/repo_id format', () => {
    const service = new StorageService();
    const key = service.buildKey('my-org', 'my-repo', 'artifacts/report.pdf');
    expect(key).toBe('my-org/my-repo/artifacts/report.pdf');
  });
});
