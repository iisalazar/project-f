import { DispatchService } from './dispatch.service';

describe('DispatchService', () => {
  it('dispatchRoute inserts dispatch and execution event', async () => {
    const prisma = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn().mockResolvedValue([{ id: '33333333-3333-3333-3333-333333333333' }]),
    } as any;

    const service = new DispatchService(prisma);
    const result = await service.dispatchRoute(
      '11111111-1111-1111-1111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      {
        routePlanId: '22222222-2222-2222-2222-222222222222',
        driverId: '33333333-3333-3333-3333-333333333333',
        vehicleId: '44444444-4444-4444-4444-444444444444',
      },
    );

    expect(result.status).toBe('assigned');
    expect(result.dispatchId).toBeDefined();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
  });

  it('dispatchStop inserts dispatch and execution event', async () => {
    const prisma = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn().mockResolvedValue([{ id: '33333333-3333-3333-3333-333333333333' }]),
    } as any;

    const service = new DispatchService(prisma);
    const result = await service.dispatchStop(
      '11111111-1111-1111-1111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      {
        stopId: '22222222-2222-2222-2222-222222222222',
        driverId: '33333333-3333-3333-3333-333333333333',
      },
    );

    expect(result.status).toBe('assigned');
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
  });
});
