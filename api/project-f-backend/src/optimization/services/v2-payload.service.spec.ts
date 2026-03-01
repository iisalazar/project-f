import { BadRequestException } from '@nestjs/common';
import { V2PayloadService } from './v2-payload.service';

describe('V2PayloadService', () => {
  let service: V2PayloadService;

  beforeEach(() => {
    service = new V2PayloadService();
  });

  it('normalizes legacy payload defaults', () => {
    const normalized = service.normalizeLegacyPayload({
      drivers: [
        {
          id: 1,
          name: 'Driver 1',
          startLocation: [121, 14],
          endLocation: [121, 14],
        },
      ],
      stops: [{ id: 10, location: [121.1, 14.1] }],
    });

    expect(normalized.drivers[0].availabilityWindow).toEqual([28800, 61200]);
    expect(normalized.drivers[0].maxTasks).toBe(4);
    expect(normalized.stops[0].serviceSeconds).toBe(300);
  });

  it('converts vroom payload to legacy payload using explicit vehicles', async () => {
    const normalized = await service.vroomToLegacyPayload(
      {
        vehicles: [
          { id: 2, start: [121.2, 14.2], end: [121.25, 14.25], max_tasks: 6 },
        ],
        jobs: [{ id: 100, location: [121.3, 14.3], service: 180 }],
      },
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      {
        $queryRaw: jest.fn(),
      } as any,
    );

    expect(normalized.drivers).toHaveLength(1);
    expect(normalized.metadata?.driverSource).toBe('vehicles');
    expect(normalized.drivers[0]).toMatchObject({
      id: 2,
      name: 'Driver 2',
      startLocation: [121.2, 14.2],
      endLocation: [121.25, 14.25],
      maxTasks: 6,
    });
    expect(normalized.stops[0]).toMatchObject({
      id: 100,
      location: [121.3, 14.3],
      serviceSeconds: 180,
    });
  });

  it('converts selectedDriverIds into optimization drivers', async () => {
    const selectedDriverId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const normalized = await service.vroomToLegacyPayload(
      {
        selectedDriverIds: [selectedDriverId],
        jobs: [{ id: 101, location: [121.4, 14.4], service: 240 }],
        planDate: '2026-03-01',
      },
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      {
        $queryRaw: jest.fn().mockResolvedValue([
          {
            id: selectedDriverId,
            name: 'Driver A',
            startLocation: [121.1, 14.1],
            endLocation: null,
            shiftStartSeconds: 30000,
            shiftEndSeconds: 60000,
          },
        ]),
      } as any,
    );

    expect(normalized.planDate).toBe('2026-03-01');
    expect(normalized.drivers).toHaveLength(1);
    expect(normalized.drivers[0]).toMatchObject({
      id: 1,
      name: 'Driver A',
      startLocation: [121.1, 14.1],
      endLocation: [121.1, 14.1],
      availabilityWindow: [30000, 60000],
    });
    expect(normalized.metadata?.vehicleToDriverMap?.['1']).toBe(
      selectedDriverId,
    );
  });

  it('throws for invalid coordinates', async () => {
    await expect(
      service.vroomToLegacyPayload(
        {
          vehicles: [{ id: 1, start: [300, 14] }],
          jobs: [{ id: 1, location: [121, 14] }],
        },
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        {
          $queryRaw: jest.fn(),
        } as any,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws for duplicate driver ids in legacy payload', () => {
    expect(() =>
      service.normalizeLegacyPayload({
        drivers: [
          {
            id: 1,
            name: 'A',
            startLocation: [121, 14],
            endLocation: [121, 14],
          },
          {
            id: 1,
            name: 'B',
            startLocation: [121, 14],
            endLocation: [121, 14],
          },
        ],
        stops: [{ id: 2, location: [121, 14] }],
      }),
    ).toThrow(BadRequestException);
  });
});
