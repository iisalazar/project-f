import { BadRequestException } from '@nestjs/common';
import { DriverExecutionService } from './driver-execution.service';

describe('DriverExecutionService', () => {
  it('returns null when no trip exists for today', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      $executeRaw: jest.fn(),
    } as any;

    const service = new DriverExecutionService(prisma);
    const result = await service.getTodayTrip(
      '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );

    expect(result).toBeNull();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('lists trips by date', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          tripId: '1',
          routePlanId: '2',
          driverId: '3',
          vehicleId: null,
          status: 'planned',
          tripDate: '2026-03-01',
          startAt: null,
          endAt: null,
        },
      ]),
      $executeRaw: jest.fn(),
    } as any;

    const service = new DriverExecutionService(prisma);
    const result = await service.listTripsByDate(
      '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '2026-03-01',
    );

    expect(result).toHaveLength(1);
    expect(result[0].tripDate).toBe('2026-03-01');
  });

  it('throws for invalid date range', async () => {
    const prisma = {
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
    } as any;

    const service = new DriverExecutionService(prisma);

    await expect(
      service.listTripsByDateRange(
        '11111111-1111-4111-8111-111111111111',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        '2026-03-02',
        '2026-03-01',
      ),
    ).rejects.toThrow(BadRequestException);
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
    const result = await service.listDriverStops(
      '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );

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
      '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '22222222-2222-4222-8222-222222222222',
      { status: 'arrived', note: 'At gate' },
    );

    expect(result.status).toBe('arrived');
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
  });
});
