import { Injectable, ConflictException } from '@nestjs/common';

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  role: 'ADMIN' | 'MEMBER';
}

@Injectable()
export class OrganizationsService {
  private organizations = new Map<
    string,
    { id: string; name: string; slug: string; userId: string; role: 'ADMIN' }
  >();

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

    return {
      id: record.id,
      name: record.name,
      slug: record.slug,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      role: 'ADMIN',
    };
  }
}
