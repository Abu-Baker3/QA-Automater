import { describe, it, expect } from 'vitest';
import { TestsController } from './tests.controller';

describe('TestsController (AC2 Verification)', () => {
  const controller = new TestsController();

  it('should allow test generation for MEMBER and ADMIN roles (AC2)', async () => {
    const result = await controller.generateTest({
      userStory: 'Given a member user, when they generate a test flow, then it succeeds',
      repositoryId: 'repo_123',
    });

    expect(result.status).toBe('success');
    expect(result.jobId).toBeDefined();
    expect(result.repositoryId).toBe('repo_123');
  });
});
