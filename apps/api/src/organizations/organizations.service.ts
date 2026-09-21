import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  role: 'ADMIN' | 'MEMBER';
  subscriptionTier: 'FREE' | 'PREMIUM';
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

export interface WorkspaceSummary {
  organizationId: string;
  name: string;
  subscriptionTier: 'FREE' | 'PREMIUM';
  usedSeats: number;
  maxSeats: number;
  members: OrganizationMemberRecord[];
  pendingInvites: OrganizationInviteRecord[];
}

export interface WorkspaceSettings {
  workspaceName: string;
  targetBaseUrl: string;
  defaultBrowser: 'chromium' | 'firefox' | 'webkit';
  headlessMode: boolean;
  aiModel: 'gemini-1.5-flash' | 'gemini-1.5-pro';
  customTestIdAttribute: string;
  exportFormat: 'typescript' | 'javascript';
}

@Injectable()
export class OrganizationsService {
  private organizations = new Map<
    string,
    {
      id: string;
      name: string;
      slug: string;
      userId: string;
      role: 'ADMIN';
      subscriptionTier: 'FREE' | 'PREMIUM';
      createdAt: Date;
      updatedAt: Date;
    }
  >();

  private settingsMap = new Map<string, WorkspaceSettings>();
  private invites = new Map<string, OrganizationInviteRecord>();
  private members: OrganizationMemberRecord[] = [];

  constructor() {
    // Initialize default demo workspace for easy development testing
    const defaultOrgId = 'org_default';
    this.organizations.set(defaultOrgId, {
      id: defaultOrgId,
      name: 'Default Workspace',
      slug: 'default-workspace',
      userId: 'user_admin',
      role: 'ADMIN',
      subscriptionTier: 'FREE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.members.push({
      id: 'mem_admin',
      organizationId: defaultOrgId,
      userId: 'user_admin',
      role: 'ADMIN',
      createdAt: new Date(),
    });
    this.settingsMap.set(defaultOrgId, {
      workspaceName: 'Default Workspace',
      targetBaseUrl: 'http://localhost:3000',
      defaultBrowser: 'chromium',
      headlessMode: true,
      aiModel: 'gemini-1.5-flash',
      customTestIdAttribute: 'data-testid',
      exportFormat: 'typescript',
    });
  }

  async getWorkspaceSettings(orgId: string): Promise<WorkspaceSettings> {
    const existing = this.settingsMap.get(orgId);
    if (existing) return existing;

    const org = this.organizations.get(orgId);
    const defaultSettings: WorkspaceSettings = {
      workspaceName: org ? org.name : 'My Workspace',
      targetBaseUrl: 'http://localhost:3000',
      defaultBrowser: 'chromium',
      headlessMode: true,
      aiModel: 'gemini-1.5-flash',
      customTestIdAttribute: 'data-testid',
      exportFormat: 'typescript',
    };

    this.settingsMap.set(orgId, defaultSettings);
    return defaultSettings;
  }

  async updateWorkspaceSettings(
    orgId: string,
    dto: Partial<WorkspaceSettings>,
  ): Promise<WorkspaceSettings> {
    const current = await this.getWorkspaceSettings(orgId);
    const updated: WorkspaceSettings = {
      ...current,
      ...dto,
    };

    this.settingsMap.set(orgId, updated);

    // Update organization name if workspaceName changed
    const org = this.organizations.get(orgId);
    if (org && dto.workspaceName) {
      org.name = dto.workspaceName;
    }

    return updated;
  }

  async createOrganization(
    userId: string,
    name: string,
    customSlug?: string,
  ): Promise<OrganizationRecord> {
    const slug = customSlug
      ? customSlug
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9-]/g, '-')
      : name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9-]/g, '-');

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
      subscriptionTier: 'FREE' as const,
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
      subscriptionTier: 'FREE',
    };
  }

  async getWorkspaceSummary(orgId: string): Promise<WorkspaceSummary> {
    const org = this.organizations.get(orgId) || {
      id: orgId,
      name: 'Acme QA Team',
      slug: orgId,
      subscriptionTier: 'FREE' as const,
    };

    const activeMembers = this.getMembers(orgId);
    const pendingInvites = (await this.getInvites(orgId)).filter((inv) => inv.status === 'PENDING');
    const usedSeats = activeMembers.length + pendingInvites.length;
    const maxSeats = org.subscriptionTier === 'PREMIUM' ? 5 : 1;

    return {
      organizationId: orgId,
      name: org.name,
      subscriptionTier: org.subscriptionTier,
      usedSeats,
      maxSeats,
      members: activeMembers,
      pendingInvites,
    };
  }

  async upgradeSubscription(
    orgId: string,
    tier: 'FREE' | 'PREMIUM',
  ): Promise<{ status: string; tier: 'FREE' | 'PREMIUM' }> {
    let org = this.organizations.get(orgId);
    if (!org) {
      org = {
        id: orgId,
        name: 'Workspace',
        slug: orgId,
        userId: 'admin_user',
        role: 'ADMIN',
        subscriptionTier: tier,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.organizations.set(orgId, org);
    } else {
      org.subscriptionTier = tier;
      org.updatedAt = new Date();
    }

    return {
      status: 'upgraded',
      tier: org.subscriptionTier,
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

    let org = this.organizations.get(orgId);
    if (!org) {
      // Create lazy org record if not found in memory map
      org = {
        id: orgId,
        name: 'Workspace',
        slug: orgId,
        userId: invitedBy,
        role: 'ADMIN',
        subscriptionTier: 'FREE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.organizations.set(orgId, org);
    }

    // Rule 1: Check Subscription Plan. Free plan does NOT allow team invites.
    if (org.subscriptionTier === 'FREE') {
      throw new ForbiddenException(
        'Team collaboration requires a Premium Subscription plan. Please upgrade your workspace to Premium to invite team members.',
      );
    }

    // Rule 2: Seat Limit Enforcement (Max 5 seats on Premium Plan)
    const activeMembers = this.getMembers(orgId);
    const pendingInvites = (await this.getInvites(orgId)).filter((inv) => inv.status === 'PENDING');
    const totalSeatsUsed = activeMembers.length + pendingInvites.length;
    const maxSeats = 5;

    if (totalSeatsUsed >= maxSeats) {
      throw new BadRequestException(
        `Workspace seat limit reached (${totalSeatsUsed}/${maxSeats} seats used). Maximum 5 members allowed per Premium workspace.`,
      );
    }

    const existingPending = Array.from(this.invites.values()).find(
      (inv) =>
        inv.organizationId === orgId &&
        inv.email.toLowerCase() === email.toLowerCase() &&
        inv.status === 'PENDING',
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

  async getInviteByToken(token: string): Promise<{
    token: string;
    email: string;
    organizationId: string;
    organizationName: string;
    role: 'ADMIN' | 'MEMBER';
    status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
    expiresAt: Date;
  }> {
    const invite = this.invites.get(token);
    if (!invite) {
      throw new NotFoundException('Invitation token not found');
    }

    const org = this.organizations.get(invite.organizationId);
    const organizationName = org ? org.name : 'Acme Workspace';

    return {
      token: invite.token,
      email: invite.email,
      organizationId: invite.organizationId,
      organizationName,
      role: invite.role,
      status: invite.status as 'PENDING' | 'ACCEPTED' | 'EXPIRED',
      expiresAt: invite.expiresAt,
    };
  }

  async acceptInviteWithSignup(
    token: string,
    _firstName: string,
    _lastName: string,
  ): Promise<{
    status: string;
    organizationId: string;
    userId: string;
    email: string;
    role: 'ADMIN' | 'MEMBER';
  }> {
    const invite = this.invites.get(token);
    if (!invite || invite.status !== 'PENDING') {
      throw new NotFoundException('Invitation not found or no longer active');
    }

    if (new Date() > invite.expiresAt) {
      invite.status = 'EXPIRED';
      throw new BadRequestException('Invitation has expired');
    }

    const userId = `user_${Date.now()}`;
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
      email: invite.email,
      role: invite.role,
    };
  }

  async getInvites(orgId: string): Promise<OrganizationInviteRecord[]> {
    return Array.from(this.invites.values()).filter((inv) => inv.organizationId === orgId);
  }

  getMembers(orgId: string): OrganizationMemberRecord[] {
    return this.members.filter((mem) => mem.organizationId === orgId);
  }
}
