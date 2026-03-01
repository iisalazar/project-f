import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createOrganization, getMe, setActiveOrganization } from './auth-api';

const apiFetchMock = vi.fn();

vi.mock('$lib/api', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

describe('auth-api', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it('gets current user profile', async () => {
    apiFetchMock.mockResolvedValue({ id: 'u1' });
    await getMe();
    expect(apiFetchMock).toHaveBeenCalledWith('/auth/me');
  });

  it('creates organization during onboarding', async () => {
    apiFetchMock.mockResolvedValue({ organizationId: 'org-1' });
    await createOrganization({ name: 'Acme', timezone: 'UTC' });
    expect(apiFetchMock).toHaveBeenCalledWith('/auth/onboarding/create-organization', {
      method: 'POST',
      body: JSON.stringify({ name: 'Acme', timezone: 'UTC' }),
    });
  });

  it('sets active organization', async () => {
    apiFetchMock.mockResolvedValue({ organizationId: 'org-1' });
    await setActiveOrganization('org-1');
    expect(apiFetchMock).toHaveBeenCalledWith('/auth/active-organization', {
      method: 'POST',
      body: JSON.stringify({ organizationId: 'org-1' }),
    });
  });
});
