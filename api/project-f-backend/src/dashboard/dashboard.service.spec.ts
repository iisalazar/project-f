import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('returns correct counts when data exists', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([
        { status: 'in_progress', cnt: 2n },
        { status: 'completed', cnt: 1n },
        { status: 'dispatched', cnt: 1n },
      ])
      .mockResolvedValueOnce([
        { activeDrivers: 3n, totalStops: 10n, completedStops: 7n },
      ]);

    const result = await service.getSummary('org-uuid-1', '2026-03-15');

    expect(result.date).toBe('2026-03-15');
    expect(result.routePlans.total).toBe(4);
    expect(result.routePlans.inProgress).toBe(3); // dispatched(1) + in_progress(2)
    expect(result.routePlans.completed).toBe(1);
    expect(result.drivers.active).toBe(3);
    expect(result.stops.done).toBe(7);
    expect(result.stops.total).toBe(10);
  });

  it('returns zeros when no data exists for the date', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { activeDrivers: 0n, totalStops: 0n, completedStops: 0n },
      ]);

    const result = await service.getSummary('org-uuid-1', '2026-03-15');

    expect(result.routePlans.total).toBe(0);
    expect(result.routePlans.inProgress).toBe(0);
    expect(result.routePlans.completed).toBe(0);
    expect(result.drivers.active).toBe(0);
    expect(result.stops.done).toBe(0);
    expect(result.stops.total).toBe(0);
  });

  it('throws BadRequestException for invalid date format', async () => {
    await expect(
      service.getSummary('org-uuid-1', 'not-a-date'),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.getSummary('org-uuid-1', '15-03-2026'),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.getSummary('org-uuid-1', '2026/03/15'),
    ).rejects.toThrow(BadRequestException);
  });

  it('does not call Prisma when date is invalid', async () => {
    await expect(
      service.getSummary('org-uuid-1', 'bad'),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('handles empty activityRows gracefully', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([{ status: 'draft', cnt: 2n }])
      .mockResolvedValueOnce([]); // empty activity result

    const result = await service.getSummary('org-uuid-1', '2026-03-15');

    expect(result.drivers.active).toBe(0);
    expect(result.stops.done).toBe(0);
    expect(result.stops.total).toBe(0);
    expect(result.routePlans.total).toBe(2);
  });
});
