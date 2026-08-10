import { describe, it, expect, beforeEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  beforeEach(() => {
    service = new OrganizationsService();
  });

  it('should create an organization and assign user ADMIN role (AC1)', async () => {
    const org = await service.createOrganization('user_123', 'Acme Engineering', 'acme-eng');
    expect(org).toBeDefined();
    expect(org.name).toBe('Acme Engineering');
    expect(org.slug).toBe('acme-eng');
    expect(org.role).toBe('ADMIN');
  });

  it('should throw ConflictException (409) if duplicate slug is attempted (AC2)', async () => {
    await service.createOrganization('user_123', 'Acme Engineering', 'acme-eng');
    await expect(
      service.createOrganization('user_456', 'Acme Duplicate', 'acme-eng'),
    ).rejects.toThrow(ConflictException);
  });
});
