import { RoutePlansService } from './route-plans.service';

describe('RoutePlansService', () => {
  it('lists route plans with filters', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          id: '11111111-1111-1111-1111-111111111111',
          status: 'optimized',
          planDate: '2026-03-01',
          createdAt: new Date(),
          updatedAt: new Date(),
          summaryMetrics: null,
        },
      ]),
      $executeRaw: jest.fn(),
    } as any;

    const service = new RoutePlansService(prisma);
    const result = await service.list('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', {
      date: '2026-03-01',
      status: 'optimized',
    });

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('optimized');
  });

  it('assigns driver and writes dispatch records', async () => {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([
          {
            id: '11111111-1111-4111-8111-111111111111',
            planDate: '2026-03-01',
          },
        ])
        .mockResolvedValueOnce([{ id: '22222222-2222-4222-8222-222222222222' }])
        .mockResolvedValueOnce([
          { id: '33333333-3333-4333-8333-333333333333' },
        ]),
      $executeRaw: jest.fn().mockResolvedValue(1),
    } as any;

    const service = new RoutePlansService(prisma);
    const result = await service.assignDriver(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '11111111-1111-4111-8111-111111111111',
      {
        driverId: '22222222-2222-4222-8222-222222222222',
      },
    );

    expect(result.status).toBe('assigned');
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(4);
  });
});
