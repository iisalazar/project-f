import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { DriverStopStatusUpdateDto } from '../dto/driver.dto';

@Injectable()
export class DriverExecutionService {
  constructor(private readonly prisma: PrismaService) {}

  async getTodayTrip(ownerUserId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        tripId: string;
        driverId: string;
        routePlanId: string | null;
        status: string;
        startAt: Date | null;
      }>
    >(Prisma.sql`
      SELECT
        t."id" AS "tripId",
        t."driverId",
        t."routePlanId",
        t."status",
        t."startAt"
      FROM "Trip" t
      WHERE t."ownerUserId" = ${ownerUserId}::uuid
      AND DATE(t."tripDate") = CURRENT_DATE
      ORDER BY t."createdAt" DESC
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  async listDriverStops(ownerUserId: string) {
    return this.prisma.$queryRaw<
      Array<{
        tripStopId: string;
        tripId: string;
        stopId: string;
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
      WHERE t."ownerUserId" = ${ownerUserId}::uuid
      AND DATE(t."tripDate") = CURRENT_DATE
      ORDER BY ts."stopOrder" ASC
    `);
  }

  async updateStopStatus(ownerUserId: string, tripStopId: string, payload: DriverStopStatusUpdateDto) {
    const now = new Date();

    await this.prisma.$executeRaw`
      UPDATE "TripStop" ts
      SET "status" = ${payload.status}, "updatedAt" = ${now}
      FROM "Trip" t
      WHERE ts."id" = ${tripStopId}::uuid
      AND ts."tripId" = t."id"
      AND t."ownerUserId" = ${ownerUserId}::uuid
    `;

    await this.prisma.$executeRaw`
      INSERT INTO "ExecutionEvent"
        ("id", "ownerUserId", "eventType", "entityId", "data", "createdAt")
      VALUES
        (${randomUUID()}::uuid, ${ownerUserId}::uuid, 'driver.stop.status.updated', ${tripStopId}::uuid, ${JSON.stringify(payload)}::jsonb, ${now})
    `;

    return {
      tripStopId,
      status: payload.status,
      updatedAt: now,
    };
  }
}
