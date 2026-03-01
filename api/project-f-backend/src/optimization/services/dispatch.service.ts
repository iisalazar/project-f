import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { DispatchRouteRequestDto, DispatchStopRequestDto } from '../dto/dispatch.dto';

@Injectable()
export class DispatchService {
  constructor(private readonly prisma: PrismaService) {}

  async dispatchRoute(ownerUserId: string, payload: DispatchRouteRequestDto) {
    const id = randomUUID();
    const now = new Date();
    await this.prisma.$executeRaw`
      INSERT INTO "Dispatch"
        ("id", "ownerUserId", "dispatchType", "routePlanId", "driverId", "vehicleId", "createdAt", "updatedAt")
      VALUES
        (${id}::uuid, ${ownerUserId}::uuid, 'route', ${payload.routePlanId}::uuid, ${payload.driverId}::uuid, ${payload.vehicleId ?? null}::uuid, ${now}, ${now})
    `;

    await this.prisma.$executeRaw`
      INSERT INTO "ExecutionEvent"
        ("id", "ownerUserId", "eventType", "entityId", "data", "createdAt")
      VALUES
        (${randomUUID()}::uuid, ${ownerUserId}::uuid, 'dispatch.route.assigned', ${id}::uuid, ${JSON.stringify(payload)}::jsonb, ${now})
    `;

    return { dispatchId: id, status: 'assigned' };
  }

  async dispatchStop(ownerUserId: string, payload: DispatchStopRequestDto) {
    const id = randomUUID();
    const now = new Date();
    await this.prisma.$executeRaw`
      INSERT INTO "Dispatch"
        ("id", "ownerUserId", "dispatchType", "stopId", "driverId", "createdAt", "updatedAt")
      VALUES
        (${id}::uuid, ${ownerUserId}::uuid, 'stop', ${payload.stopId}::uuid, ${payload.driverId}::uuid, ${now}, ${now})
    `;

    await this.prisma.$executeRaw`
      INSERT INTO "ExecutionEvent"
        ("id", "ownerUserId", "eventType", "entityId", "data", "createdAt")
      VALUES
        (${randomUUID()}::uuid, ${ownerUserId}::uuid, 'dispatch.stop.assigned', ${id}::uuid, ${JSON.stringify(payload)}::jsonb, ${now})
    `;

    return { dispatchId: id, status: 'assigned' };
  }
}
