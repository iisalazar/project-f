export type OrganizationRole = 'org_admin' | 'dispatcher' | 'driver' | 'viewer';

export interface OrganizationMembership {
  organizationId: string;
  organizationName: string;
  timezone: string;
  role: OrganizationRole;
  status: string;
}

export interface AuthContext {
  activeOrganizationId: string | null;
  activeRole: OrganizationRole | null;
  memberships: OrganizationMembership[];
  needsOnboarding: boolean;
}
