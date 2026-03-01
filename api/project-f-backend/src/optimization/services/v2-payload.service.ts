import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type { CreateOptimizationJobRequestDto } from '../dto/create-optimization-job.dto';
import type { VroomOptimizationRequestDto } from '../dto/vroom-optimization.dto';

const DEFAULT_WINDOW: [number, number] = [8 * 3600, 17 * 3600];
type DriverSource = 'selected-driver-ids' | 'vehicles';

interface EnrichedOptimizationJobRequestDto extends CreateOptimizationJobRequestDto {
  planDate?: string;
  selectedDriverIds?: string[];
  metadata?: {
    driverSource: DriverSource;
    vehicleToDriverMap?: Record<string, string>;
  };
}

@Injectable()
export class V2PayloadService {
  normalizeLegacyPayload(
    payload: CreateOptimizationJobRequestDto,
  ): CreateOptimizationJobRequestDto {
    const { drivers, stops } = payload;

    if (!Array.isArray(drivers) || drivers.length === 0) {
      throw new BadRequestException('drivers must be a non-empty array');
    }
    if (!Array.isArray(stops) || stops.length === 0) {
      throw new BadRequestException('stops must be a non-empty array');
    }

    const driverIds = new Set<number>();
    for (const driver of drivers) {
      if (!driver?.id || !driver?.name) {
        throw new BadRequestException('driver.id and driver.name are required');
      }
      if (driverIds.has(driver.id)) {
        throw new BadRequestException('driver ids must be unique');
      }
      driverIds.add(driver.id);
      this.assertLocation(driver.startLocation, 'driver.startLocation');
      this.assertLocation(driver.endLocation, 'driver.endLocation');
      if (driver.breaks) {
        for (const breakItem of driver.breaks) {
          if (breakItem.timeWindows) {
            for (const timeWindow of breakItem.timeWindows) {
              this.assertTimeWindow(timeWindow, 'driver.breaks.timeWindows');
            }
          }
        }
      }
    }

    const stopIds = new Set<number>();
    for (const stop of stops) {
      if (!stop?.id) {
        throw new BadRequestException('stop.id is required');
      }
      if (stopIds.has(stop.id)) {
        throw new BadRequestException('stop ids must be unique');
      }
      stopIds.add(stop.id);
      this.assertLocation(stop.location, 'stop.location');
      if (stop.skills) {
        this.assertSkills(stop.skills, 'stop.skills');
      }
    }

    if (Array.isArray(payload.shipments)) {
      for (const shipment of payload.shipments) {
        if (!shipment?.id) {
          throw new BadRequestException('shipment.id is required');
        }
        this.assertLocation(shipment.pickup?.location, 'shipment.pickup.location');
        this.assertLocation(
          shipment.delivery?.location,
          'shipment.delivery.location',
        );
        if (shipment.skills) {
          this.assertSkills(shipment.skills, 'shipment.skills');
        }
      }
    }

    return {
      ...(payload as any),
      drivers: drivers.map((driver) => ({
        ...driver,
        availabilityWindow: driver.availabilityWindow ?? DEFAULT_WINDOW,
        maxTasks: driver.maxTasks ?? 4,
        breaks: driver.breaks?.map((breakItem) => ({
          ...breakItem,
          timeWindows: breakItem.timeWindows,
        })),
      })),
      stops: stops.map((stop) => ({
        ...stop,
        serviceSeconds: stop.serviceSeconds ?? 300,
      })),
      shipments: payload.shipments?.map((shipment) => ({
        ...shipment,
        pickup: {
          ...shipment.pickup,
          serviceSeconds: shipment.pickup.serviceSeconds ?? 300,
        },
        delivery: {
          ...shipment.delivery,
          serviceSeconds: shipment.delivery.serviceSeconds ?? 300,
        },
      })),
    };
  }

  async vroomToLegacyPayload(
    payload: VroomOptimizationRequestDto,
    organizationId: string,
    prisma: PrismaService,
  ): Promise<EnrichedOptimizationJobRequestDto> {
    if (!payload || !Array.isArray(payload.jobs) || payload.jobs.length === 0) {
      throw new BadRequestException('jobs are required');
    }

    const planDate = this.normalizePlanDate(payload.planDate);
    const selectedDriverIds = Array.isArray(payload.selectedDriverIds)
      ? [
          ...new Set(
            payload.selectedDriverIds.filter(
              (value) => typeof value === 'string',
            ),
          ),
        ]
      : [];

    const hasVehicles =
      Array.isArray(payload.vehicles) && payload.vehicles.length > 0;
    let metadata: EnrichedOptimizationJobRequestDto['metadata'];
    let drivers: CreateOptimizationJobRequestDto['drivers'];

    if (selectedDriverIds.length > 0) {
      drivers = await this.driversFromSelectedIds(
        selectedDriverIds,
        organizationId,
        prisma,
      );
      metadata = {
        driverSource: 'selected-driver-ids',
        vehicleToDriverMap: Object.fromEntries(
          drivers.map((driver) => [
            String(driver.id),
            selectedDriverIds[driver.id - 1],
          ]),
        ),
      };
    } else if (hasVehicles) {
      drivers = payload.vehicles!.map((vehicle) => {
        if (
          vehicle?.id === undefined ||
          vehicle?.id === null ||
          Number.isNaN(Number(vehicle.id))
        ) {
          throw new BadRequestException('vehicle.id is required');
        }
        this.assertLocation(vehicle.start, 'vehicle.start');
        if (vehicle.end) {
          this.assertLocation(vehicle.end, 'vehicle.end');
        }
        return {
          id: Number(vehicle.id),
          name: `Driver ${vehicle.id}`,
          startLocation: vehicle.start,
          endLocation: vehicle.end ?? vehicle.start,
          availabilityWindow: vehicle.time_window ?? DEFAULT_WINDOW,
          maxTasks: vehicle.max_tasks,
          breaks: vehicle.breaks?.map((item) => ({
            id: item.id,
            serviceSeconds: item.service,
            timeWindows: item.time_windows,
          })),
        };
      });
      metadata = { driverSource: 'vehicles' };
    } else {
      throw new BadRequestException('Provide vehicles or selectedDriverIds');
    }

    const stops = payload.jobs.map((job) => {
      if (!job?.id) {
        throw new BadRequestException('job.id is required');
      }
      this.assertLocation(job.location, 'job.location');
      return {
        id: job.id,
        location: job.location,
        serviceSeconds: job.service,
        priority: job.priority,
        skills: job.skills,
      };
    });

    const shipments = payload.shipments?.map((shipment) => {
      if (!shipment?.id) {
        throw new BadRequestException('shipment.id is required');
      }
      this.assertLocation(shipment.pickup?.location, 'shipment.pickup.location');
      this.assertLocation(
        shipment.delivery?.location,
        'shipment.delivery.location',
      );
      if (shipment.skills) {
        this.assertSkills(shipment.skills, 'shipment.skills');
      }

      return {
        id: shipment.id,
        skills: shipment.skills,
        priority: shipment.priority,
        pickup: {
          id: shipment.pickup.id,
          location: shipment.pickup.location,
          serviceSeconds: shipment.pickup.service,
        },
        delivery: {
          id: shipment.delivery.id,
          location: shipment.delivery.location,
          serviceSeconds: shipment.delivery.service,
        },
      };
    });

    return this.normalizeLegacyPayload({
      drivers,
      stops,
      shipments,
      planDate,
      selectedDriverIds:
        selectedDriverIds.length > 0 ? selectedDriverIds : undefined,
      metadata,
    } as EnrichedOptimizationJobRequestDto) as EnrichedOptimizationJobRequestDto;
  }

  private async driversFromSelectedIds(
    selectedDriverIds: string[],
    organizationId: string,
    prisma: PrismaService,
  ): Promise<CreateOptimizationJobRequestDto['drivers']> {
    for (const id of selectedDriverIds) {
      if (!this.isUuid(id)) {
        throw new BadRequestException(
          'selectedDriverIds must contain valid UUIDs',
        );
      }
    }

    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        startLocation: Prisma.JsonValue | null;
        endLocation: Prisma.JsonValue | null;
        shiftStartSeconds: number | null;
        shiftEndSeconds: number | null;
      }>
    >(Prisma.sql`
      SELECT
        d."id",
        d."name",
        d."startLocation",
        d."endLocation",
        d."shiftStartSeconds",
        d."shiftEndSeconds"
      FROM "Driver" d
      WHERE d."organizationId" = ${organizationId}::uuid
      AND d."deletedAt" IS NULL
      AND d."id" IN (${Prisma.join(selectedDriverIds.map((id) => Prisma.sql`${id}::uuid`))})
    `);

    if (rows.length !== selectedDriverIds.length) {
      throw new BadRequestException(
        'One or more selectedDriverIds are not in the active organization',
      );
    }

    const byId = new Map(rows.map((row) => [row.id, row]));
    return selectedDriverIds.map((driverId, index) => {
      const row = byId.get(driverId);
      if (!row) {
        throw new BadRequestException(
          'One or more selectedDriverIds are not in the active organization',
        );
      }

      const startLocation = this.asLocation(
        row.startLocation,
        `driver(${driverId}).startLocation`,
      );
      const endLocation = row.endLocation
        ? this.asLocation(row.endLocation, `driver(${driverId}).endLocation`)
        : startLocation;

      return {
        id: index + 1,
        name: row.name,
        startLocation,
        endLocation,
        availabilityWindow:
          Number.isFinite(row.shiftStartSeconds) &&
          Number.isFinite(row.shiftEndSeconds)
            ? [row.shiftStartSeconds!, row.shiftEndSeconds!]
            : DEFAULT_WINDOW,
        maxTasks: 4,
      };
    });
  }

  private normalizePlanDate(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('planDate must be in YYYY-MM-DD format');
    }
    return value;
  }

  private asLocation(
    value: Prisma.JsonValue | null,
    label: string,
  ): [number, number] {
    if (!Array.isArray(value) || value.length !== 2) {
      throw new BadRequestException(`${label} must be [lon, lat]`);
    }
    const [lon, lat] = value as number[];
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      throw new BadRequestException(`${label} must be numbers`);
    }
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
      throw new BadRequestException(`${label} out of range`);
    }
    return [lon, lat];
  }

  private assertLocation(value: unknown, label: string) {
    if (!Array.isArray(value) || value.length !== 2) {
      throw new BadRequestException(`${label} must be [lon, lat]`);
    }
    const [lon, lat] = value as number[];
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      throw new BadRequestException(`${label} must be numbers`);
    }
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
      throw new BadRequestException(`${label} out of range`);
    }
  }

  private assertSkills(value: unknown, label: string) {
    if (
      !Array.isArray(value) ||
      !value.every(
        (item) => Number.isInteger(item) && Number(item) >= 0,
      )
    ) {
      throw new BadRequestException(`${label} must be an array of integers`);
    }
  }

  private assertTimeWindow(value: unknown, label: string) {
    if (
      !Array.isArray(value) ||
      value.length !== 2 ||
      !Number.isFinite(value[0]) ||
      !Number.isFinite(value[1]) ||
      Number(value[0]) > Number(value[1])
    ) {
      throw new BadRequestException(`${label} must be [start, end] seconds`);
    }
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
