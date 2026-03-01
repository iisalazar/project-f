import { apiFetch } from '$lib/api';

export interface AuthMe {
  id: string;
  email: string;
  auth: {
    activeOrganizationId: string | null;
    activeRole: 'org_admin' | 'dispatcher' | 'driver' | 'viewer' | null;
    needsOnboarding: boolean;
    memberships: Array<{
      organizationId: string;
      organizationName: string;
      timezone: string;
      role: string;
      status: string;
    }>;
  } | null;
}

export function getMe() {
  return apiFetch<AuthMe>('/auth/me');
}

export function createOrganization(payload: { name: string; timezone?: string }) {
  return apiFetch<{ organizationId: string; role: string }>('/auth/onboarding/create-organization', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function setActiveOrganization(organizationId: string) {
  return apiFetch<{ organizationId: string; role: string }>('/auth/active-organization', {
    method: 'POST',
    body: JSON.stringify({ organizationId }),
  });
}
