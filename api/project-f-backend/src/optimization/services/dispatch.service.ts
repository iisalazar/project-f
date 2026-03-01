import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { DispatchRouteRequestDto, DispatchStopRequestDto } from '../dto/dispatch.dto';

@Injectable()
export class DispatchService {
  constructor(private readonly prisma: PrismaService) {}

  async dispatchRoute(ownerUserId: string, organizationId: string, payload: DispatchRouteRequestDto) {
    await this.ensureDriverInOrganization(organizationId, payload.driverId);
    const id = randomUUID();
    const now = new Date();
    await this.prisma.$executeRaw`
      INSERT INTO "Dispatch"
        ("id", "ownerUserId", "organizationId", "dispatchType", "routePlanId", "driverId", "vehicleId", "createdAt", "updatedAt")
      VALUES
        (${id}::uuid, ${ownerUserId}::uuid, ${organizationId}::uuid, 'route', ${payload.routePlanId}::uuid, ${payload.driverId}::uuid, ${payload.vehicleId ?? null}::uuid, ${now}, ${now})
    `;

    await this.prisma.$executeRaw`
      INSERT INTO "ExecutionEvent"
        ("id", "ownerUserId", "eventType", "entityId", "data", "createdAt")
      VALUES
        (${randomUUID()}::uuid, ${ownerUserId}::uuid, 'dispatch.route.assigned', ${id}::uuid, ${JSON.stringify(payload)}::jsonb, ${now})
    `;

    return { dispatchId: id, status: 'assigned' };
  }

  async dispatchStop(ownerUserId: string, organizationId: string, payload: DispatchStopRequestDto) {
    await this.ensureDriverInOrganization(organizationId, payload.driverId);
    const id = randomUUID();
    const now = new Date();
    await this.prisma.$executeRaw`
      INSERT INTO "Dispatch"
        ("id", "ownerUserId", "organizationId", "dispatchType", "stopId", "driverId", "createdAt", "updatedAt")
      VALUES
        (${id}::uuid, ${ownerUserId}::uuid, ${organizationId}::uuid, 'stop', ${payload.stopId}::uuid, ${payload.driverId}::uuid, ${now}, ${now})
    `;

    await this.prisma.$executeRaw`
      INSERT INTO "ExecutionEvent"
        ("id", "ownerUserId", "eventType", "entityId", "data", "createdAt")
      VALUES
        (${randomUUID()}::uuid, ${ownerUserId}::uuid, 'dispatch.stop.assigned', ${id}::uuid, ${JSON.stringify(payload)}::jsonb, ${now})
    `;

    return { dispatchId: id, status: 'assigned' };
  }

  private async ensureDriverInOrganization(organizationId: string, driverId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "Driver"
      WHERE "id" = ${driverId}::uuid
      AND "organizationId" = ${organizationId}::uuid
      AND "deletedAt" IS NULL
      LIMIT 1
    `);

    if (!rows[0]) {
      throw new BadRequestException('Driver is not available in the active organization');
    }
  }
}
