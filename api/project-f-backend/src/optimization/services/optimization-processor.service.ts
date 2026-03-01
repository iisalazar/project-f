import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Polly from 'polly-js';
import { Prisma } from '@prisma/client';
import type { OptimizationJobResultDto } from '../dto/optimization-result.dto';
import { randomUUID } from 'crypto';

const VROOM_URL = process.env.VROOM_URL ?? 'http://localhost:3000/';

@Injectable()
export class OptimizationProcessorService {
  private readonly retryPolicy = Polly().waitAndRetry([1000, 2000, 4000]);

  constructor(private readonly prisma: PrismaService) {}

  async processJob(jobId: string) {
    const job = await this.prisma.optimizationJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return;
    }

    await this.prisma.optimizationJob.update({
      where: { id: jobId },
      data: { status: 'processing' },
    });

    await this.prisma.optimizationJobLog.create({
      data: {
        optimizationJobId: jobId,
        type: 'info',
        message: 'Processing started',
      },
    });

    try {
      const payload = job.data as any;
      const vroomRequest = this.buildVroomRequest(payload);

      console.log('Sending vroom request', JSON.stringify(vroomRequest));

      const vroomResponse =
        await this.retryPolicy.executeForPromise<OptimizationJobResultDto>(
          async () => {
            const res = await fetch(VROOM_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(vroomRequest),
            });
            if (!res.ok) {
              const text = await res.text();
              throw new Error(`VROOM error: ${res.status} ${text}`);
            }
            return res.json();
          },
        );

      await this.persistRouteArtifacts(job, payload, vroomResponse);

      await this.prisma.optimizationJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          result: vroomResponse as unknown as Prisma.InputJsonValue,
          resultVersion: 'v1',
          errorMessage: null,
          lastErrorAt: null,
        },
      });

      await this.prisma.optimizationJobLog.create({
        data: {
          optimizationJobId: jobId,
          type: 'info',
          message: 'Processing completed',
        },
      });
    } catch (error: any) {
      await this.prisma.optimizationJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorMessage: error?.message ?? 'Unknown error',
          lastErrorAt: new Date(),
        },
      });

      await this.prisma.optimizationJobLog.create({
        data: {
          optimizationJobId: jobId,
          type: 'error',
          message: 'Processing failed',
          data: { error: error?.message ?? 'Unknown error' },
        },
      });
    }
  }

  private async persistRouteArtifacts(
    job: {
      id: string;
      ownerUserId: string;
    },
    payload: any,
    result: OptimizationJobResultDto,
  ) {
    const now = new Date();
    const routePlanId = randomUUID();
    const planDate =
      this.normalizePlanDate(payload?.planDate) ??
      now.toISOString().slice(0, 10);
    const organizationId =
      typeof payload?.organizationId === 'string' &&
      this.isUuid(payload.organizationId)
        ? payload.organizationId
        : null;

    const routeStatus = result?.routes?.length > 0 ? 'optimized' : 'failed';

    await this.prisma.$executeRaw`
      INSERT INTO "RoutePlan"
        ("id", "ownerUserId", "organizationId", "status", "planDate", "inputPayload", "summaryMetrics", "geometry", "createdAt", "updatedAt")
      VALUES
        (
          ${routePlanId}::uuid,
          ${job.ownerUserId}::uuid,
          ${organizationId}::uuid,
          ${routeStatus}::"RoutePlanStatus",
          ${planDate}::date,
          ${JSON.stringify(payload)}::jsonb,
          ${JSON.stringify(result.summary ?? null)}::jsonb,
          ${JSON.stringify({ routes: result.routes?.map((route) => route.geometry ?? null) ?? [] })}::jsonb,
          ${now},
          ${now}
        )
    `;

    const stopIdByJobId = new Map<number, string | null>();
    for (const stop of Array.isArray(payload?.stops) ? payload.stops : []) {
      const parsedStopId = Number(stop?.id);
      if (!Number.isFinite(parsedStopId)) {
        continue;
      }
      const asUuid =
        typeof stop?.externalStopId === 'string' &&
        this.isUuid(stop.externalStopId)
          ? stop.externalStopId
          : null;
      stopIdByJobId.set(parsedStopId, asUuid);
    }

    const vehicleToDriverMap = (payload?.metadata?.vehicleToDriverMap ??
      {}) as Record<string, string>;

    let routeStopOrder = 1;
    for (const route of result.routes ?? []) {
      const tripId = randomUUID();
      const mappedDriverId = vehicleToDriverMap[String(route.vehicle)] ?? null;
      const driverId =
        mappedDriverId && this.isUuid(mappedDriverId) ? mappedDriverId : null;

      await this.prisma.$executeRaw`
        INSERT INTO "Trip"
          ("id", "ownerUserId", "organizationId", "routePlanId", "driverId", "status", "tripDate", "createdAt", "updatedAt")
        VALUES
          (
            ${tripId}::uuid,
            ${job.ownerUserId}::uuid,
            ${organizationId}::uuid,
            ${routePlanId}::uuid,
            ${driverId}::uuid,
            'planned'::"TripStatus",
            ${planDate}::date,
            ${now},
            ${now}
          )
      `;

      let tripStopOrder = 1;
      for (const step of route.steps ?? []) {
        if (step.type !== 'job') {
          continue;
        }

        const stopId = Number(step.job ?? step.id);
        const etaAt = this.secondsAfterStartOfDay(
          planDate,
          Number(step.arrival),
        );

        await this.prisma.$executeRaw`
          INSERT INTO "RouteStop"
            ("id", "routePlanId", "stopId", "stopOrder", "etaAt", "distanceMeters", "durationSeconds", "createdAt", "updatedAt")
          VALUES
            (
              ${randomUUID()}::uuid,
              ${routePlanId}::uuid,
              ${stopIdByJobId.get(stopId) ?? null}::uuid,
              ${routeStopOrder},
              ${etaAt},
              ${Number.isFinite(step.distance) ? Math.round(step.distance) : null},
              ${Number.isFinite(step.duration) ? Math.round(step.duration) : null},
              ${now},
              ${now}
            )
        `;
        routeStopOrder += 1;

        await this.prisma.$executeRaw`
          INSERT INTO "TripStop"
            ("id", "tripId", "stopId", "stopOrder", "status", "etaAt", "createdAt", "updatedAt")
          VALUES
            (
              ${randomUUID()}::uuid,
              ${tripId}::uuid,
              ${stopIdByJobId.get(stopId) ?? null}::uuid,
              ${tripStopOrder},
              'pending'::"TripStopStatus",
              ${etaAt},
              ${now},
              ${now}
            )
        `;
        tripStopOrder += 1;
      }
    }

    await this.prisma.optimizationJobLog.create({
      data: {
        optimizationJobId: job.id,
        type: 'info',
        message: 'Route plan artifacts persisted',
        data: {
          routePlanId,
          routes: result?.routes?.length ?? 0,
        },
      },
    });
  }

  private buildVroomRequest(payload: any) {
    const vehicles = payload.drivers.map((driver: any) => ({
      id: driver.id,
      start: driver.startLocation,
      end: driver.endLocation,
      time_window: driver.availabilityWindow ?? [28800, 61200],
      max_tasks: driver.maxTasks ?? 4,
      breaks: Array.isArray(driver.breaks)
        ? driver.breaks.map((item: any) => ({
            id: item.id,
            service: item.serviceSeconds,
            time_windows: item.timeWindows,
          }))
        : undefined,
    }));

    const jobs = payload.stops.map((stop: any) => ({
      id: stop.id,
      location: stop.location,
      service: stop.serviceSeconds ?? 300,
      priority: stop.priority,
      skills: stop.skills,
    }));

    const shipments = Array.isArray(payload.shipments)
      ? payload.shipments.map((shipment: any) => ({
          id: shipment.id,
          pickup: {
            id: shipment.pickup.id,
            location: shipment.pickup.location,
            service: shipment.pickup.serviceSeconds ?? 300,
          },
          delivery: {
            id: shipment.delivery.id,
            location: shipment.delivery.location,
            service: shipment.delivery.serviceSeconds ?? 300,
          },
          priority: shipment.priority,
          skills: shipment.skills,
        }))
      : undefined;

    return {
      vehicles,
      jobs,
      shipments,
      options: { g: true },
    };
  }

  private normalizePlanDate(value: unknown): string | null {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }
    return value;
  }

  private secondsAfterStartOfDay(
    planDate: string,
    seconds: number | undefined,
  ): Date | null {
    if (!Number.isFinite(seconds)) {
      return null;
    }

    const date = new Date(`${planDate}T00:00:00.000Z`);
    date.setUTCSeconds(date.getUTCSeconds() + Math.floor(seconds!));
    return date;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
