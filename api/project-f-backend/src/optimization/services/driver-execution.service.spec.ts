import { DriverExecutionService } from './driver-execution.service';

describe('DriverExecutionService', () => {
  it('returns null when no trip exists for today', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      $executeRaw: jest.fn(),
    } as any;

    const service = new DriverExecutionService(prisma);
    const result = await service.getTodayTrip('11111111-1111-1111-1111-111111111111');

    expect(result).toBeNull();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('lists driver stops', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          tripStopId: '1',
          tripId: '2',
          stopId: '3',
          stopOrder: 1,
          status: 'pending',
          etaAt: null,
        },
      ]),
      $executeRaw: jest.fn(),
    } as any;

    const service = new DriverExecutionService(prisma);
    const result = await service.listDriverStops('11111111-1111-1111-1111-111111111111');

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('pending');
  });

  it('updates stop status and writes execution event', async () => {
    const prisma = {
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn().mockResolvedValue(1),
    } as any;

    const service = new DriverExecutionService(prisma);
    const result = await service.updateStopStatus(
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      { status: 'arrived', note: 'At gate' },
    );

    expect(result.status).toBe('arrived');
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
  });
});
