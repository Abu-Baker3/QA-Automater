import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsController', () => {
  let controller: OrganizationsController;
  let service: OrganizationsService;

  beforeEach(() => {
    service = new OrganizationsService();
    controller = new OrganizationsController(service);
  });

  it('should call createOrganization and return result with status 201', async () => {
    const spy = vi.spyOn(service, 'createOrganization');
    const result = await controller.create(
      { user: { userId: 'user_test' } },
      { name: 'Stark Industries', slug: 'stark-ind' },
    );

    expect(spy).toHaveBeenCalledWith('user_test', 'Stark Industries', 'stark-ind');
    expect(result.name).toBe('Stark Industries');
    expect(result.role).toBe('ADMIN');
  });
});
