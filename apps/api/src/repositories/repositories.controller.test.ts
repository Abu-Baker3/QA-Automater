import { describe, it, expect } from 'vitest';
import { RepositoriesController } from './repositories.controller';

describe('RepositoriesController', () => {
  const controller = new RepositoriesController();

  it('should allow connecting repository for ADMIN role (AC2)', async () => {
    const result = await controller.connectRepository({
      name: 'acme-inc/frontend',
      repoUrl: 'https://github.com/acme-inc/frontend',
    });

    expect(result.status).toBe('connected');
    expect(result.repository.name).toBe('acme-inc/frontend');
  });
});
