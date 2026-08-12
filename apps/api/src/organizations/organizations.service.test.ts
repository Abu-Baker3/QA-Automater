import { describe, it, expect, beforeEach } from 'vitest';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  beforeEach(() => {
    service = new OrganizationsService();
  });

  it('should create an organization and assign user ADMIN role', async () => {
    const org = await service.createOrganization('user_123', 'Acme Engineering', 'acme-eng');
    expect(org).toBeDefined();
    expect(org.name).toBe('Acme Engineering');
    expect(org.slug).toBe('acme-eng');
    expect(org.role).toBe('ADMIN');
  });

  it('should throw ConflictException (409) if duplicate slug is attempted', async () => {
    await service.createOrganization('user_123', 'Acme Engineering', 'acme-eng');
    await expect(
      service.createOrganization('user_456', 'Acme Duplicate', 'acme-eng'),
    ).rejects.toThrow(ConflictException);
  });

  it('should allow Admin to invite team member and assign MEMBER role on acceptance (AC1)', async () => {
    const org = await service.createOrganization('admin_123', 'Acme QA', 'acme-qa');
    const invite = await service.inviteMember(org.id, 'admin_123', 'qa@acme.com', 'MEMBER');

    expect(invite).toBeDefined();
    expect(invite.email).toBe('qa@acme.com');
    expect(invite.role).toBe('MEMBER');
    expect(invite.status).toBe('PENDING');
    expect(invite.token).toBeDefined();

    const acceptResult = await service.acceptInvite('user_qa_456', invite.token);
    expect(acceptResult.status).toBe('accepted');
    expect(acceptResult.organizationId).toBe(org.id);
    expect(acceptResult.userId).toBe('user_qa_456');
    expect(acceptResult.role).toBe('MEMBER');

    const members = await service.getMembers(org.id);
    expect(members).toHaveLength(2);
    expect(members.find((m) => m.userId === 'user_qa_456')?.role).toBe('MEMBER');
  });

  it('should throw ConflictException when sending duplicate pending invite to same email', async () => {
    const org = await service.createOrganization('admin_123', 'Acme QA', 'acme-qa');
    await service.inviteMember(org.id, 'admin_123', 'qa@acme.com', 'MEMBER');

    await expect(
      service.inviteMember(org.id, 'admin_123', 'qa@acme.com', 'MEMBER'),
    ).rejects.toThrow(ConflictException);
  });

  it('should throw NotFoundException when accepting non-existent or invalid token', async () => {
    await expect(service.acceptInvite('user_123', 'invalid_token')).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException when inviting invalid email', async () => {
    const org = await service.createOrganization('admin_123', 'Acme QA', 'acme-qa');
    await expect(service.inviteMember(org.id, 'admin_123', 'invalidemail', 'MEMBER')).rejects.toThrow(
      BadRequestException,
    );
  });
});
