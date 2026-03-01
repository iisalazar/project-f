import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AssignRoutePlanDriverDto,
  ReorderRouteStopsDto,
} from '../dto/route-plans.dto';

@Injectable()
export class RoutePlansService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    organizationId: string,
    params: {
      date?: string;
      status?: string;
      driverId?: string;
      actorUserId?: string;
      restrictToActorDriver?: boolean;
    },
  ) {
    const date = params.date ? this.assertDate(params.date, 'date') : null;
    const status = params.status?.trim() || null;
    const driverId = params.driverId?.trim() || null;
    const actorUserId = params.actorUserId?.trim() || null;
    const restrictToActorDriver = Boolean(params.restrictToActorDriver);

    if (driverId) {
      this.assertUuid(driverId, 'driverId');
    }
    if (actorUserId) {
      this.assertUuid(actorUserId, 'actorUserId');
    }

    return this.prisma.$queryRaw<
      Array<{
        id: string;
        status: string;
        planDate: string | null;
        createdAt: Date;
        updatedAt: Date;
        summaryMetrics: Prisma.JsonValue | null;
      }>
    >(Prisma.sql`
      SELECT
        rp."id",
        rp."status"::text AS "status",
        rp."planDate"::text AS "planDate",
        rp."createdAt",
        rp."updatedAt",
        rp."summaryMetrics"
      FROM "RoutePlan" rp
      WHERE rp."organizationId" = ${organizationId}::uuid
      AND (${date}::text IS NULL OR rp."planDate" = ${date}::date)
      AND (${status}::text IS NULL OR rp."status"::text = ${status})
      AND (
        ${restrictToActorDriver}::boolean = FALSE
        OR EXISTS (
          SELECT 1
          FROM "Trip" t
          JOIN "Driver" d ON d."id" = t."driverId"
          WHERE t."routePlanId" = rp."id"
          AND d."organizationId" = ${organizationId}::uuid
          AND d."userId" = ${actorUserId}::uuid
          AND d."deletedAt" IS NULL
        )
      )
      AND (
        ${driverId}::text IS NULL
        OR EXISTS (
          SELECT 1
          FROM "Trip" t
          WHERE t."routePlanId" = rp."id"
          AND t."driverId" = ${driverId}::uuid
        )
      )
      ORDER BY rp."planDate" DESC NULLS LAST, rp."createdAt" DESC
    `);
  }

  async getById(
    organizationId: string,
    routePlanId: string,
    actorUserId?: string,
    restrictToActorDriver = false,
  ) {
    this.assertUuid(routePlanId, 'id');
    const linkedUserId = actorUserId?.trim() || null;
    if (linkedUserId) {
      this.assertUuid(linkedUserId, 'actorUserId');
    }

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        status: string;
        planDate: string | null;
        createdAt: Date;
        updatedAt: Date;
        inputPayload: Prisma.JsonValue | null;
        summaryMetrics: Prisma.JsonValue | null;
        geometry: Prisma.JsonValue | null;
      }>
    >(Prisma.sql`
      SELECT
        rp."id",
        rp."status"::text AS "status",
        rp."planDate"::text AS "planDate",
        rp."createdAt",
        rp."updatedAt",
        rp."inputPayload",
        rp."summaryMetrics",
        rp."geometry"
      FROM "RoutePlan" rp
      WHERE rp."id" = ${routePlanId}::uuid
      AND rp."organizationId" = ${organizationId}::uuid
      AND (
        ${restrictToActorDriver}::boolean = FALSE
        OR EXISTS (
          SELECT 1
          FROM "Trip" t
          JOIN "Driver" d ON d."id" = t."driverId"
          WHERE t."routePlanId" = rp."id"
          AND d."organizationId" = ${organizationId}::uuid
          AND d."userId" = ${linkedUserId}::uuid
          AND d."deletedAt" IS NULL
        )
      )
      LIMIT 1
    `);

    if (!rows[0]) {
      throw new NotFoundException('Route plan not found');
    }

    const trips = await this.prisma.$queryRaw<
      Array<{
        tripId: string;
        driverId: string | null;
        vehicleId: string | null;
        status: string;
        tripDate: string;
      }>
    >(Prisma.sql`
      SELECT
        t."id" AS "tripId",
        t."driverId",
        t."vehicleId",
        t."status"::text AS "status",
        t."tripDate"::text AS "tripDate"
      FROM "Trip" t
      WHERE t."routePlanId" = ${routePlanId}::uuid
      ORDER BY t."createdAt" ASC
    `);

    return {
      ...rows[0],
      trips,
    };
  }

  async listStops(
    organizationId: string,
    routePlanId: string,
    actorUserId?: string,
    restrictToActorDriver = false,
  ) {
    this.assertUuid(routePlanId, 'id');
    const linkedUserId = actorUserId?.trim() || null;
    if (linkedUserId) {
      this.assertUuid(linkedUserId, 'actorUserId');
    }

    const routeRows = await this.prisma.$queryRaw<
      Array<{ id: string }>
    >(Prisma.sql`
      SELECT rp."id"
      FROM "RoutePlan" rp
      WHERE rp."id" = ${routePlanId}::uuid
      AND rp."organizationId" = ${organizationId}::uuid
      AND (
        ${restrictToActorDriver}::boolean = FALSE
        OR EXISTS (
          SELECT 1
          FROM "Trip" t
          JOIN "Driver" d ON d."id" = t."driverId"
          WHERE t."routePlanId" = rp."id"
          AND d."organizationId" = ${organizationId}::uuid
          AND d."userId" = ${linkedUserId}::uuid
          AND d."deletedAt" IS NULL
        )
      )
      LIMIT 1
    `);

    if (!routeRows[0]) {
      throw new NotFoundException('Route plan not found');
    }

    return this.prisma.$queryRaw<
      Array<{
        routeStopId: string;
        routePlanId: string;
        stopId: string | null;
        stopOrder: number;
        etaAt: Date | null;
        distanceMeters: number | null;
        durationSeconds: number | null;
      }>
    >(Prisma.sql`
      SELECT
        rs."id" AS "routeStopId",
        rs."routePlanId",
        rs."stopId",
        rs."stopOrder",
        rs."etaAt",
        rs."distanceMeters",
        rs."durationSeconds"
      FROM "RouteStop" rs
      WHERE rs."routePlanId" = ${routePlanId}::uuid
      ORDER BY rs."stopOrder" ASC
    `);
  }

  async assignDriver(
    ownerUserId: string,
    organizationId: string,
    routePlanId: string,
    payload: AssignRoutePlanDriverDto,
  ) {
    this.assertUuid(routePlanId, 'id');
    this.assertUuid(payload.driverId, 'driverId');
    if (payload.vehicleId) {
      this.assertUuid(payload.vehicleId, 'vehicleId');
    }

    const routeRows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        planDate: string | null;
      }>
    >(Prisma.sql`
      SELECT rp."id", rp."planDate"::text AS "planDate"
      FROM "RoutePlan" rp
      WHERE rp."id" = ${routePlanId}::uuid
      AND rp."organizationId" = ${organizationId}::uuid
      LIMIT 1
    `);

    const routePlan = routeRows[0];
    if (!routePlan) {
      throw new NotFoundException('Route plan not found');
    }

    const assignedDriver = await this.ensureDriverInOrganization(
      organizationId,
      payload.driverId,
    );
    if (!assignedDriver.userId) {
      throw new BadRequestException(
        'Driver must have a linked user account before assignment',
      );
    }

    const tripRows = await this.prisma.$queryRaw<
      Array<{ id: string }>
    >(Prisma.sql`
      SELECT t."id"
      FROM "Trip" t
      WHERE t."routePlanId" = ${routePlanId}::uuid
      ORDER BY t."createdAt" ASC
      LIMIT 1
    `);

    const now = new Date();
    const tripId = tripRows[0]?.id ?? randomUUID();
    const tripDate = routePlan.planDate ?? now.toISOString().slice(0, 10);

    if (tripRows[0]) {
      await this.prisma.$executeRaw`
        UPDATE "Trip"
        SET
          "ownerUserId" = ${assignedDriver.userId ?? ownerUserId}::uuid,
          "driverId" = ${payload.driverId}::uuid,
          "vehicleId" = ${payload.vehicleId ?? null}::uuid,
          "updatedAt" = ${now}
        WHERE "id" = ${tripId}::uuid
      `;
    } else {
      await this.prisma.$executeRaw`
        INSERT INTO "Trip"
          ("id", "ownerUserId", "organizationId", "routePlanId", "driverId", "vehicleId", "status", "tripDate", "createdAt", "updatedAt")
        VALUES
          (
            ${tripId}::uuid,
            ${assignedDriver.userId ?? ownerUserId}::uuid,
            ${organizationId}::uuid,
            ${routePlanId}::uuid,
            ${payload.driverId}::uuid,
            ${payload.vehicleId ?? null}::uuid,
            'planned'::"TripStatus",
            ${tripDate}::date,
            ${now},
            ${now}
          )
      `;
    }

    const dispatchId = randomUUID();
    await this.prisma.$executeRaw`
      INSERT INTO "Dispatch"
        ("id", "ownerUserId", "organizationId", "dispatchType", "routePlanId", "driverId", "vehicleId", "createdAt", "updatedAt")
      VALUES
        (${dispatchId}::uuid, ${ownerUserId}::uuid, ${organizationId}::uuid, 'route', ${routePlanId}::uuid, ${payload.driverId}::uuid, ${payload.vehicleId ?? null}::uuid, ${now}, ${now})
    `;

    await this.prisma.$executeRaw`
      UPDATE "RoutePlan"
      SET "status" = 'dispatched'::"RoutePlanStatus", "updatedAt" = ${now}
      WHERE "id" = ${routePlanId}::uuid
    `;

    await this.prisma.$executeRaw`
      INSERT INTO "ExecutionEvent"
        ("id", "ownerUserId", "organizationId", "eventType", "entityId", "data", "createdAt")
      VALUES
        (
          ${randomUUID()}::uuid,
          ${ownerUserId}::uuid,
          ${organizationId}::uuid,
          'dispatch.route.assigned',
          ${dispatchId}::uuid,
          ${JSON.stringify({ routePlanId, ...payload })}::jsonb,
          ${now}
        )
    `;

    return {
      routePlanId,
      tripId,
      dispatchId,
      driverId: payload.driverId,
      vehicleId: payload.vehicleId ?? null,
      status: 'assigned',
    };
  }

  async reorderStops(
    ownerUserId: string,
    organizationId: string,
    routePlanId: string,
    payload: ReorderRouteStopsDto,
  ) {
    this.assertUuid(routePlanId, 'id');
    if (!Array.isArray(payload.routeStopIds) || payload.routeStopIds.length === 0) {
      throw new BadRequestException('routeStopIds must be a non-empty array');
    }
    for (const routeStopId of payload.routeStopIds) {
      this.assertUuid(routeStopId, 'routeStopId');
    }

    const existsRows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "RoutePlan"
      WHERE "id" = ${routePlanId}::uuid
      AND "organizationId" = ${organizationId}::uuid
      LIMIT 1
    `);
    if (!existsRows[0]) {
      throw new NotFoundException('Route plan not found');
    }

    const knownStops = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "RouteStop"
      WHERE "routePlanId" = ${routePlanId}::uuid
      AND "id" IN (${Prisma.join(payload.routeStopIds.map((id) => Prisma.sql`${id}::uuid`))})
    `);
    if (knownStops.length !== payload.routeStopIds.length) {
      throw new BadRequestException('One or more routeStopIds are not in the route plan');
    }

    const now = new Date();
    for (let idx = 0; idx < payload.routeStopIds.length; idx += 1) {
      const routeStopId = payload.routeStopIds[idx];
      await this.prisma.$executeRaw`
        UPDATE "RouteStop"
        SET
          "stopOrder" = ${idx + 1},
          "etaAt" = ${new Date(now.getTime() + idx * 5 * 60 * 1000)},
          "updatedAt" = ${now}
        WHERE "id" = ${routeStopId}::uuid
        AND "routePlanId" = ${routePlanId}::uuid
      `;
    }

    await this.prisma.$executeRaw`
      UPDATE "RoutePlan"
      SET "updatedAt" = ${now}
      WHERE "id" = ${routePlanId}::uuid
    `;

    await this.prisma.$executeRaw`
      INSERT INTO "ExecutionEvent"
        ("id", "ownerUserId", "organizationId", "eventType", "entityId", "data", "createdAt")
      VALUES
        (
          ${randomUUID()}::uuid,
          ${ownerUserId}::uuid,
          ${organizationId}::uuid,
          'route.stop.reordered',
          ${routePlanId}::uuid,
          ${JSON.stringify({ routeStopIds: payload.routeStopIds })}::jsonb,
          ${now}
        )
    `;

    return {
      routePlanId,
      reordered: payload.routeStopIds.length,
      status: 'reordered',
    };
  }

  private async ensureDriverInOrganization(
    organizationId: string,
    driverId: string,
  ) {
    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; userId: string | null }>
    >(Prisma.sql`
      SELECT "id", "userId"
      FROM "Driver"
      WHERE "id" = ${driverId}::uuid
      AND "organizationId" = ${organizationId}::uuid
      AND "deletedAt" IS NULL
      LIMIT 1
    `);

    const driver = rows[0];
    if (!driver) {
      throw new BadRequestException(
        'Driver is not available in the active organization',
      );
    }

    return driver;
  }

  private assertDate(value: string, field: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(`${field} must be in YYYY-MM-DD format`);
    }
    return value;
  }

  private assertUuid(value: string, field: string): void {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      )
    ) {
      throw new BadRequestException(`${field} must be a valid UUID`);
    }
  }
}
