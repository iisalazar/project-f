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

  it('converts vroom payload to legacy payload', () => {
    const normalized = service.vroomToLegacyPayload({
      vehicles: [{ id: 2, start: [121.2, 14.2], end: [121.25, 14.25], max_tasks: 6 }],
      jobs: [{ id: 100, location: [121.3, 14.3], service: 180 }],
    });

    expect(normalized.drivers).toHaveLength(1);
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

  it('throws for invalid coordinates', () => {
    expect(() =>
      service.vroomToLegacyPayload({
        vehicles: [{ id: 1, start: [300, 14] }],
        jobs: [{ id: 1, location: [121, 14] }],
      }),
    ).toThrow(BadRequestException);
  });

  it('throws for duplicate driver ids in legacy payload', () => {
    expect(() =>
      service.normalizeLegacyPayload({
        drivers: [
          { id: 1, name: 'A', startLocation: [121, 14], endLocation: [121, 14] },
          { id: 1, name: 'B', startLocation: [121, 14], endLocation: [121, 14] },
        ],
        stops: [{ id: 2, location: [121, 14] }],
      }),
    ).toThrow(BadRequestException);
  });
});
