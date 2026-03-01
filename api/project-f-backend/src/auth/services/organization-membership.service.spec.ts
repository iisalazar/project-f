import { ForbiddenException } from '@nestjs/common';
import { OrganizationMembershipService } from './organization-membership.service';

describe('OrganizationMembershipService', () => {
  it('resolveAuthContext marks onboarding required when no memberships', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ activeOrganizationId: null }]),
      $executeRaw: jest.fn(),
    } as any;

    const service = new OrganizationMembershipService(prisma);
    const context = await service.resolveAuthContext('11111111-1111-1111-1111-111111111111', 'token');

    expect(context.needsOnboarding).toBe(true);
    expect(context.activeOrganizationId).toBeNull();
  });

  it('setActiveOrganization requires active membership', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      $executeRaw: jest.fn(),
    } as any;

    const service = new OrganizationMembershipService(prisma);

    await expect(
      service.setActiveOrganization(
        '11111111-1111-1111-1111-111111111111',
        'token',
        '22222222-2222-2222-2222-222222222222',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('createOrganizationOnboarding creates org and sets active organization', async () => {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ id: 'org-1', name: 'Acme', timezone: 'UTC' }])
        .mockResolvedValueOnce([{ role: 'org_admin', status: 'active' }]),
      $executeRaw: jest.fn().mockResolvedValue(1),
    } as any;

    const service = new OrganizationMembershipService(prisma);
    const result = await service.createOrganizationOnboarding(
      '11111111-1111-1111-1111-111111111111',
      'token',
      { name: 'Acme' },
    );

    expect(result.organizationId).toBe('org-1');
    expect(result.role).toBe('org_admin');
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
  });
});
