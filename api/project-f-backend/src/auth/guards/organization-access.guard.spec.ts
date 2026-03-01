import { ConflictException } from '@nestjs/common';
import { OrganizationAccessGuard } from './organization-access.guard';

describe('OrganizationAccessGuard', () => {
  it('allows when active organization exists', () => {
    const guard = new OrganizationAccessGuard();
    const result = guard.canActivate({
      switchToHttp: () => ({
        getRequest: () => ({ authContext: { activeOrganizationId: 'org-1' } }),
      }),
    } as any);
    expect(result).toBe(true);
  });

  it('throws when active organization is missing', () => {
    const guard = new OrganizationAccessGuard();
    expect(() =>
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => ({ authContext: {} }) }),
      } as any),
    ).toThrow(ConflictException);
  });
});
