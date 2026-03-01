import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { DriverStopStatusUpdateDto } from '../dto/driver.dto';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class DriverExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getTodayTrip(actorUserId: string, organizationId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        tripId: string;
        driverId: string;
        routePlanId: string | null;
        status: string;
        tripDate: string;
        startAt: Date | null;
      }>
    >(Prisma.sql`
      SELECT
        t."id" AS "tripId",
        t."driverId",
        t."routePlanId",
        t."status",
        t."tripDate"::text AS "tripDate",
        t."startAt"
      FROM "Trip" t
      JOIN "Driver" d ON d."id" = t."driverId"
      WHERE d."userId" = ${actorUserId}::uuid
      AND d."organizationId" = ${organizationId}::uuid
      AND d."deletedAt" IS NULL
      AND DATE(t."tripDate") = CURRENT_DATE
      ORDER BY t."createdAt" DESC
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  async listTripsByDate(
    actorUserId: string,
    organizationId: string,
    date: string,
  ) {
    const tripDate = this.assertDate(date, 'date');

    return this.prisma.$queryRaw<
      Array<{
        tripId: string;
        routePlanId: string | null;
        driverId: string | null;
        vehicleId: string | null;
        status: string;
        tripDate: string;
        startAt: Date | null;
        endAt: Date | null;
      }>
    >(Prisma.sql`
      SELECT
        t."id" AS "tripId",
        t."routePlanId",
        t."driverId",
        t."vehicleId",
        t."status",
        t."tripDate"::text AS "tripDate",
        t."startAt",
        t."endAt"
      FROM "Trip" t
      JOIN "Driver" d ON d."id" = t."driverId"
      WHERE d."userId" = ${actorUserId}::uuid
      AND d."organizationId" = ${organizationId}::uuid
      AND d."deletedAt" IS NULL
      AND t."tripDate" = ${tripDate}::date
      ORDER BY t."createdAt" DESC
    `);
  }

  async listTripsByDateRange(
    actorUserId: string,
    organizationId: string,
    from: string,
    to: string,
  ) {
    const fromDate = this.assertDate(from, 'from');
    const toDate = this.assertDate(to, 'to');
    if (fromDate > toDate) {
      throw new BadRequestException('from must be less than or equal to to');
    }

    return this.prisma.$queryRaw<
      Array<{
        tripId: string;
        routePlanId: string | null;
        driverId: string | null;
        vehicleId: string | null;
        status: string;
        tripDate: string;
        startAt: Date | null;
        endAt: Date | null;
      }>
    >(Prisma.sql`
      SELECT
        t."id" AS "tripId",
        t."routePlanId",
        t."driverId",
        t."vehicleId",
        t."status",
        t."tripDate"::text AS "tripDate",
        t."startAt",
        t."endAt"
      FROM "Trip" t
      JOIN "Driver" d ON d."id" = t."driverId"
      WHERE d."userId" = ${actorUserId}::uuid
      AND d."organizationId" = ${organizationId}::uuid
      AND d."deletedAt" IS NULL
      AND t."tripDate" >= ${fromDate}::date
      AND t."tripDate" <= ${toDate}::date
      ORDER BY t."tripDate" ASC, t."createdAt" ASC
    `);
  }

  async listTripStops(actorUserId: string, organizationId: string, tripId: string) {
    this.assertUuid(tripId, 'tripId');

    const tripRows = await this.prisma.$queryRaw<
      Array<{ id: string }>
    >(Prisma.sql`
      SELECT t."id"
      FROM "Trip" t
      JOIN "Driver" d ON d."id" = t."driverId"
      WHERE t."id" = ${tripId}::uuid
      AND d."userId" = ${actorUserId}::uuid
      AND d."organizationId" = ${organizationId}::uuid
      AND d."deletedAt" IS NULL
      LIMIT 1
    `);

    if (!tripRows[0]) {
      throw new NotFoundException('Trip not found');
    }

    return this.prisma.$queryRaw<
      Array<{
        tripStopId: string;
        tripId: string;
        stopId: string | null;
        stopOrder: number;
        status: string;
        etaAt: Date | null;
        arrivedAt: Date | null;
        completedAt: Date | null;
        failureReason: string | null;
      }>
    >(Prisma.sql`
      SELECT
        ts."id" AS "tripStopId",
        ts."tripId",
        ts."stopId",
        ts."stopOrder",
        ts."status",
        ts."etaAt",
        ts."arrivedAt",
        ts."completedAt",
        ts."failureReason"
      FROM "TripStop" ts
      WHERE ts."tripId" = ${tripId}::uuid
      ORDER BY ts."stopOrder" ASC
    `);
  }

  async listDriverStops(
    actorUserId: string,
    organizationId: string,
    date?: string,
  ) {
    const tripDate = date ? this.assertDate(date, 'date') : null;

    return this.prisma.$queryRaw<
      Array<{
        tripStopId: string;
        tripId: string;
        stopId: string | null;
        stopOrder: number;
        status: string;
        etaAt: Date | null;
      }>
    >(Prisma.sql`
      SELECT
        ts."id" AS "tripStopId",
        ts."tripId",
        ts."stopId",
        ts."stopOrder",
        ts."status",
        ts."etaAt"
      FROM "TripStop" ts
      JOIN "Trip" t ON t."id" = ts."tripId"
      JOIN "Driver" d ON d."id" = t."driverId"
      WHERE d."userId" = ${actorUserId}::uuid
      AND d."organizationId" = ${organizationId}::uuid
      AND d."deletedAt" IS NULL
      AND (
        ${tripDate}::text IS NULL
        AND DATE(t."tripDate") = CURRENT_DATE
        OR ${tripDate}::text IS NOT NULL
        AND t."tripDate" = ${tripDate}::date
      )
      ORDER BY ts."stopOrder" ASC
    `);
  }

  async updateStopStatus(
    actorUserId: string,
    organizationId: string,
    tripStopId: string,
    payload: DriverStopStatusUpdateDto,
  ) {
    this.assertUuid(tripStopId, 'id');
    const now = new Date();

    const updatedRows = await this.prisma.$executeRaw`
      UPDATE "TripStop" ts
      SET "status" = (${payload.status})::"TripStopStatus", "updatedAt" = ${now}
      FROM "Trip" t, "Driver" d
      WHERE ts."id" = ${tripStopId}::uuid
      AND ts."tripId" = t."id"
      AND d."id" = t."driverId"
      AND d."userId" = ${actorUserId}::uuid
      AND d."organizationId" = ${organizationId}::uuid
      AND d."deletedAt" IS NULL
    `;

    if (Number(updatedRows) === 0) {
      throw new NotFoundException('Trip stop not found');
    }

    await this.prisma.$executeRaw`
      INSERT INTO "ExecutionEvent"
        ("id", "ownerUserId", "eventType", "entityId", "data", "createdAt")
      VALUES
        (${randomUUID()}::uuid, ${actorUserId}::uuid, 'driver.stop.status.updated', ${tripStopId}::uuid, ${JSON.stringify(payload)}::jsonb, ${now})
    `;

    const notificationEventType = this.toNotificationEventType(payload.status);
    if (notificationEventType) {
      const recipientRows = await this.prisma.$queryRaw<
        Array<{ externalRef: string | null }>
      >(Prisma.sql`
        SELECT s."externalRef"
        FROM "TripStop" ts
        LEFT JOIN "Stop" s ON s."id" = ts."stopId"
        WHERE ts."id" = ${tripStopId}::uuid
        LIMIT 1
      `);
      const recipient = Array.isArray(recipientRows)
        ? recipientRows[0]?.externalRef ?? undefined
        : undefined;
      await this.notificationsService.enqueueEvent(
        actorUserId,
        organizationId,
        notificationEventType,
        {
          tripStopId,
          status: payload.status,
          note: payload.note,
          recipient,
        },
      );
    }

    return {
      tripStopId,
      status: payload.status,
      updatedAt: now,
    };
  }

  private assertDate(value: string, field: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(`${field} must be in YYYY-MM-DD format`);
    }
    return value;
  }

  private assertUuid(value: string, field: string) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      )
    ) {
      throw new BadRequestException(`${field} must be a valid UUID`);
    }
  }

  private toNotificationEventType(status: string): string | null {
    if (status === 'enroute') return 'stop.enroute';
    if (status === 'arrived') return 'stop.arrived';
    if (status === 'completed') return 'stop.delivered';
    if (status === 'failed') return 'stop.failed';
    return null;
  }
}
