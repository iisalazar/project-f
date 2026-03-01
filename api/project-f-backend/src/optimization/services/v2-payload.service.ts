import { BadRequestException, Injectable } from '@nestjs/common';
import type { CreateOptimizationJobRequestDto } from '../dto/create-optimization-job.dto';
import type { VroomOptimizationRequestDto } from '../dto/vroom-optimization.dto';

const DEFAULT_WINDOW: [number, number] = [8 * 3600, 17 * 3600];

@Injectable()
export class V2PayloadService {
  normalizeLegacyPayload(payload: CreateOptimizationJobRequestDto): CreateOptimizationJobRequestDto {
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
    }

    return {
      drivers: drivers.map((driver) => ({
        ...driver,
        availabilityWindow: driver.availabilityWindow ?? DEFAULT_WINDOW,
        maxTasks: driver.maxTasks ?? 4,
      })),
      stops: stops.map((stop) => ({
        ...stop,
        serviceSeconds: stop.serviceSeconds ?? 300,
      })),
    };
  }

  vroomToLegacyPayload(payload: VroomOptimizationRequestDto): CreateOptimizationJobRequestDto {
    if (!payload || !Array.isArray(payload.vehicles) || !Array.isArray(payload.jobs)) {
      throw new BadRequestException('vehicles and jobs are required');
    }

    const drivers = payload.vehicles.map((vehicle) => {
      if (!vehicle?.id) {
        throw new BadRequestException('vehicle.id is required');
      }
      this.assertLocation(vehicle.start, 'vehicle.start');
      if (vehicle.end) {
        this.assertLocation(vehicle.end, 'vehicle.end');
      }
      return {
        id: vehicle.id,
        name: `Driver ${vehicle.id}`,
        startLocation: vehicle.start,
        endLocation: vehicle.end ?? vehicle.start,
        availabilityWindow: vehicle.time_window ?? DEFAULT_WINDOW,
        maxTasks: vehicle.max_tasks,
      };
    });

    const stops = payload.jobs.map((job) => {
      if (!job?.id) {
        throw new BadRequestException('job.id is required');
      }
      this.assertLocation(job.location, 'job.location');
      return {
        id: job.id,
        location: job.location,
        serviceSeconds: job.service,
      };
    });

    return this.normalizeLegacyPayload({ drivers, stops });
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
}
