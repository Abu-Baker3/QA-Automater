import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  role: 'ADMIN' | 'MEMBER';
}

export interface OrganizationInviteRecord {
  id: string;
  organizationId: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  invitedBy: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface OrganizationMemberRecord {
  id: string;
  organizationId: string;
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  createdAt: Date;
}

@Injectable()
export class OrganizationsService {
  private organizations = new Map<
    string,
    { id: string; name: string; slug: string; userId: string; role: 'ADMIN' }
  >();

  private invites = new Map<string, OrganizationInviteRecord>();
  private members: OrganizationMemberRecord[] = [];

  async createOrganization(
    userId: string,
    name: string,
    customSlug?: string,
  ): Promise<OrganizationRecord> {
    const slug = customSlug
      ? customSlug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-')
      : name.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');

    const existing = Array.from(this.organizations.values()).find((org) => org.slug === slug);
    if (existing) {
      throw new ConflictException(`Organization with slug "${slug}" already exists`);
    }

    const orgId = `org_${Date.now()}`;
    const record = {
      id: orgId,
      name,
      slug,
      userId,
      role: 'ADMIN' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.organizations.set(orgId, record);

    // Auto assign creator as ADMIN member
    this.members.push({
      id: `mem_${Date.now()}`,
      organizationId: orgId,
      userId,
      role: 'ADMIN',
      createdAt: new Date(),
    });

    return {
      id: record.id,
      name: record.name,
      slug: record.slug,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      role: 'ADMIN',
    };
  }

  async inviteMember(
    orgId: string,
    invitedBy: string,
    email: string,
    role: 'ADMIN' | 'MEMBER' = 'MEMBER',
  ): Promise<OrganizationInviteRecord> {
    if (!email || !email.includes('@')) {
      throw new BadRequestException('Invalid email address provided for invitation');
    }

    const org = this.organizations.get(orgId);
    if (!org) {
      throw new NotFoundException(`Organization with ID "${orgId}" not found`);
    }

    const existingPending = Array.from(this.invites.values()).find(
      (inv) => inv.organizationId === orgId && inv.email.toLowerCase() === email.toLowerCase() && inv.status === 'PENDING',
    );
    if (existingPending) {
      throw new ConflictException(`Pending invitation already exists for email "${email}"`);
    }

    const inviteId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const inviteRecord: OrganizationInviteRecord = {
      id: inviteId,
      organizationId: orgId,
      email: email.toLowerCase().trim(),
      role,
      token,
      status: 'PENDING',
      invitedBy,
      expiresAt,
      createdAt: new Date(),
    };

    this.invites.set(token, inviteRecord);
    return inviteRecord;
  }

  async acceptInvite(
    userId: string,
    token: string,
  ): Promise<{ status: string; organizationId: string; userId: string; role: 'ADMIN' | 'MEMBER' }> {
    const invite = this.invites.get(token);
    if (!invite || invite.status !== 'PENDING') {
      throw new NotFoundException('Invitation not found or no longer active');
    }

    if (new Date() > invite.expiresAt) {
      invite.status = 'EXPIRED';
      throw new BadRequestException('Invitation has expired');
    }

    invite.status = 'ACCEPTED';

    const memberRecord: OrganizationMemberRecord = {
      id: `mem_${Date.now()}`,
      organizationId: invite.organizationId,
      userId,
      role: invite.role,
      createdAt: new Date(),
    };

    this.members.push(memberRecord);

    return {
      status: 'accepted',
      organizationId: invite.organizationId,
      userId,
      role: invite.role,
    };
  }

  async getInvites(orgId: string): Promise<OrganizationInviteRecord[]> {
    return Array.from(this.invites.values()).filter((inv) => inv.organizationId === orgId);
  }

  async getMembers(orgId: string): Promise<OrganizationMemberRecord[]> {
    return this.members.filter((mem) => mem.organizationId === orgId);
  }
}
