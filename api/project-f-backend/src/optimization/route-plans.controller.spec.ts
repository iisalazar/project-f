import { RoutePlansController } from './route-plans.controller';

describe('RoutePlansController', () => {
  it('restricts route plan listing to actor when active role is driver', async () => {
    const routePlansService = {
      list: jest.fn().mockResolvedValue([]),
    } as any;

    const controller = new RoutePlansController(routePlansService);

    await controller.list(
      {
        authContext: {
          activeOrganizationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          activeRole: 'driver',
        },
        user: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
      } as any,
      '2026-03-01',
      'optimized',
      undefined,
    );

    expect(routePlansService.list).toHaveBeenCalledWith(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      expect.objectContaining({
        actorUserId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        restrictToActorDriver: true,
      }),
    );
  });

  it('does not restrict route plan listing to actor for non-driver roles', async () => {
    const routePlansService = {
      list: jest.fn().mockResolvedValue([]),
    } as any;

    const controller = new RoutePlansController(routePlansService);

    await controller.list(
      {
        authContext: {
          activeOrganizationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          activeRole: 'dispatcher',
        },
        user: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
      } as any,
      undefined,
      undefined,
      undefined,
    );

    expect(routePlansService.list).toHaveBeenCalledWith(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      expect.objectContaining({
        actorUserId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        restrictToActorDriver: false,
      }),
    );
  });
});
