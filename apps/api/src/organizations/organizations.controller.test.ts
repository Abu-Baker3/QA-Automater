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

  it('should allow Admin to invite member and list invites (AC1)', async () => {
    const org = await service.createOrganization('user_test', 'Stark Industries', 'stark-ind');

    const inviteResult = await controller.inviteMember(
      org.id,
      { user: { userId: 'user_test' } },
      { email: 'rhodey@stark.com', role: 'MEMBER' },
    );

    expect(inviteResult.email).toBe('rhodey@stark.com');
    expect(inviteResult.role).toBe('MEMBER');
    expect(inviteResult.status).toBe('PENDING');

    const invitesList = await controller.getInvites(org.id);
    expect(invitesList).toHaveLength(1);
    expect(invitesList[0]?.email).toBe('rhodey@stark.com');
  });

  it('should accept invite token for authenticated user (AC1)', async () => {
    const org = await service.createOrganization('user_test', 'Stark Industries', 'stark-ind');
    const invite = await service.inviteMember(org.id, 'user_test', 'rhodey@stark.com', 'MEMBER');

    const acceptResult = await controller.acceptInvite(
      { user: { userId: 'user_rhodey' } },
      { token: invite.token },
    );

    expect(acceptResult.status).toBe('accepted');
    expect(acceptResult.organizationId).toBe(org.id);
    expect(acceptResult.userId).toBe('user_rhodey');
    expect(acceptResult.role).toBe('MEMBER');
  });
});
