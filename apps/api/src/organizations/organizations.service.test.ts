import { describe, it, expect, beforeEach } from 'vitest';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  beforeEach(() => {
    service = new OrganizationsService();
  });

  it('should create an organization and assign user ADMIN role with FREE tier', async () => {
    const org = await service.createOrganization('user_123', 'Acme Engineering', 'acme-eng');
    expect(org).toBeDefined();
    expect(org.name).toBe('Acme Engineering');
    expect(org.slug).toBe('acme-eng');
    expect(org.role).toBe('ADMIN');
    expect(org.subscriptionTier).toBe('FREE');
  });

  it('should throw ConflictException (409) if duplicate slug is attempted', async () => {
    await service.createOrganization('user_123', 'Acme Engineering', 'acme-eng');
    await expect(
      service.createOrganization('user_456', 'Acme Duplicate', 'acme-eng'),
    ).rejects.toThrow(ConflictException);
  });

  it('should throw ForbiddenException when attempting to invite team member on FREE plan', async () => {
    const org = await service.createOrganization('admin_123', 'Acme QA', 'acme-qa');
    await expect(
      service.inviteMember(org.id, 'admin_123', 'qa@acme.com', 'MEMBER'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should allow Admin to invite team member on PREMIUM plan up to seat limit (5 seats max)', async () => {
    const org = await service.createOrganization('admin_123', 'Acme QA', 'acme-qa');
    await service.upgradeSubscription(org.id, 'PREMIUM');

    const invite = await service.inviteMember(org.id, 'admin_123', 'qa@acme.com', 'MEMBER');

    expect(invite).toBeDefined();
    expect(invite.email).toBe('qa@acme.com');
    expect(invite.role).toBe('MEMBER');
    expect(invite.status).toBe('PENDING');

    const acceptResult = await service.acceptInvite('user_qa_456', invite.token);
    expect(acceptResult.status).toBe('accepted');

    const summary = await service.getWorkspaceSummary(org.id);
    expect(summary.usedSeats).toBe(2); // 1 owner + 1 accepted member
    expect(summary.maxSeats).toBe(5);
  });

  it('should enforce 5 seats maximum limit on PREMIUM plan', async () => {
    const org = await service.createOrganization('admin_123', 'Acme QA', 'acme-qa');
    await service.upgradeSubscription(org.id, 'PREMIUM');

    // 1 owner already exists. Add 4 invites (total 5 seats)
    await service.inviteMember(org.id, 'admin_123', 'user1@acme.com', 'MEMBER');
    await service.inviteMember(org.id, 'admin_123', 'user2@acme.com', 'MEMBER');
    await service.inviteMember(org.id, 'admin_123', 'user3@acme.com', 'MEMBER');
    await service.inviteMember(org.id, 'admin_123', 'user4@acme.com', 'MEMBER');

    // 6th member attempt should throw BadRequestException
    await expect(
      service.inviteMember(org.id, 'admin_123', 'user5@acme.com', 'MEMBER'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw ConflictException when sending duplicate pending invite', async () => {
    const org = await service.createOrganization('admin_123', 'Acme QA', 'acme-qa');
    await service.upgradeSubscription(org.id, 'PREMIUM');

    await service.inviteMember(org.id, 'admin_123', 'qa@acme.com', 'MEMBER');
    await expect(
      service.inviteMember(org.id, 'admin_123', 'qa@acme.com', 'MEMBER'),
    ).rejects.toThrow(ConflictException);
  });

  it('should throw NotFoundException when accepting invalid token', async () => {
    await expect(service.acceptInvite('user_123', 'invalid_token')).rejects.toThrow(
      NotFoundException,
    );
  });
});
