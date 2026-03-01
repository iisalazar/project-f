import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  it('allows when no roles are required', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;

    const guard = new RolesGuard(reflector);
    const result = guard.canActivate({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as any);

    expect(result).toBe(true);
  });

  it('throws when role is not allowed', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['org_admin']),
    } as unknown as Reflector;

    const guard = new RolesGuard(reflector);

    expect(() =>
      guard.canActivate({
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({ getRequest: () => ({ authContext: { activeRole: 'viewer' } }) }),
      } as any),
    ).toThrow(ForbiddenException);
  });
});
