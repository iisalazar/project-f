import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  DispatchRouteRequestDto,
  DispatchStopRequestDto,
} from '../dto/dispatch.dto';

export interface DispatchRuleDecision {
  accepted: boolean;
  reasons: string[];
}

@Injectable()
export class DispatchService {
  constructor(private readonly prisma: PrismaService) {}

  async dispatchRoute(
    ownerUserId: string,
    organizationId: string,
    payload: DispatchRouteRequestDto,
  ) {
    const context = await this.loadRouteContext(organizationId, payload);
    const decision = this.evaluateRouteRules(context);

    if (!decision.accepted) {
      await this.writeDecisionEvent(
        ownerUserId,
        organizationId,
        'dispatch.route.rejected',
        payload.routePlanId,
        payload,
        decision,
      );
      throw new BadRequestException(`Dispatch rejected: ${decision.reasons.join('; ')}`);
    }

    const id = randomUUID();
    const now = new Date();
    await this.prisma.$executeRaw`
      INSERT INTO "Dispatch"
        ("id", "ownerUserId", "organizationId", "dispatchType", "routePlanId", "driverId", "vehicleId", "createdAt", "updatedAt")
      VALUES
        (${id}::uuid, ${ownerUserId}::uuid, ${organizationId}::uuid, 'route', ${payload.routePlanId}::uuid, ${payload.driverId}::uuid, ${payload.vehicleId ?? null}::uuid, ${now}, ${now})
    `;

    await this.writeDecisionEvent(
      ownerUserId,
      organizationId,
      'dispatch.route.assigned',
      id,
      payload,
      decision,
    );

    return { dispatchId: id, status: 'assigned', decision };
  }

  async dispatchStop(
    ownerUserId: string,
    organizationId: string,
    payload: DispatchStopRequestDto,
  ) {
    const context = await this.loadStopContext(organizationId, payload);
    const decision = this.evaluateStopRules(context);

    if (!decision.accepted) {
      await this.writeDecisionEvent(
        ownerUserId,
        organizationId,
        'dispatch.stop.rejected',
        payload.stopId,
        payload,
        decision,
      );
      throw new BadRequestException(`Dispatch rejected: ${decision.reasons.join('; ')}`);
    }

    const id = randomUUID();
    const now = new Date();
    await this.prisma.$executeRaw`
      INSERT INTO "Dispatch"
        ("id", "ownerUserId", "organizationId", "dispatchType", "stopId", "driverId", "vehicleId", "createdAt", "updatedAt")
      VALUES
        (${id}::uuid, ${ownerUserId}::uuid, ${organizationId}::uuid, 'stop', ${payload.stopId}::uuid, ${payload.driverId}::uuid, ${payload.vehicleId ?? null}::uuid, ${now}, ${now})
    `;

    await this.writeDecisionEvent(
      ownerUserId,
      organizationId,
      'dispatch.stop.assigned',
      id,
      payload,
      decision,
    );

    return { dispatchId: id, status: 'assigned', decision };
  }

  private async loadRouteContext(
    organizationId: string,
    payload: DispatchRouteRequestDto,
  ) {
    const [routeRows, driverRows, vehicleRows, routeStats] = await Promise.all([
      this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id"
        FROM "RoutePlan"
        WHERE "id" = ${payload.routePlanId}::uuid
        AND "organizationId" = ${organizationId}::uuid
        LIMIT 1
      `),
      this.prisma.$queryRaw<
        Array<{
          id: string;
          state: string;
          shiftStartSeconds: number | null;
          shiftEndSeconds: number | null;
          startLocation: Prisma.JsonValue | null;
        }>
      >(Prisma.sql`
        SELECT "id", "state"::text AS "state", "shiftStartSeconds", "shiftEndSeconds", "startLocation"
        FROM "Driver"
        WHERE "id" = ${payload.driverId}::uuid
        AND "organizationId" = ${organizationId}::uuid
        AND "deletedAt" IS NULL
        LIMIT 1
      `),
      payload.vehicleId
        ? this.prisma.$queryRaw<
            Array<{
              id: string;
              capacity: Prisma.JsonValue | null;
              skills: Prisma.JsonValue | null;
            }>
          >(Prisma.sql`
            SELECT "id", "capacity", "skills"
            FROM "Vehicle"
            WHERE "id" = ${payload.vehicleId}::uuid
            AND "organizationId" = ${organizationId}::uuid
            LIMIT 1
          `)
        : Promise.resolve([]),
      this.prisma.$queryRaw<
        Array<{
          stopCount: bigint;
          requiredSkills: Prisma.JsonValue | null;
        }>
      >(Prisma.sql`
        SELECT
          COUNT(rs."id")::bigint AS "stopCount",
          COALESCE(
            jsonb_agg(DISTINCT s."timeWindow" -> 'requiredSkills') FILTER (WHERE s."timeWindow" ? 'requiredSkills'),
            '[]'::jsonb
          ) AS "requiredSkills"
        FROM "RouteStop" rs
        LEFT JOIN "Stop" s ON s."id" = rs."stopId"
        WHERE rs."routePlanId" = ${payload.routePlanId}::uuid
      `),
    ]);

    if (!routeRows[0]) {
      throw new BadRequestException('Route plan is not available in the active organization');
    }

    return {
      driver: this.ensureDriver(driverRows),
      vehicle: vehicleRows[0] ?? null,
      stopCount: Number(routeStats[0]?.stopCount ?? 0),
      requiredSkillsByStop: routeStats[0]?.requiredSkills,
    };
  }

  private async loadStopContext(
    organizationId: string,
    payload: DispatchStopRequestDto,
  ) {
    const [stopRows, driverRows, vehicleRows] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{
          id: string;
          location: Prisma.JsonValue;
          timeWindow: Prisma.JsonValue | null;
        }>
      >(Prisma.sql`
        SELECT "id", "location", "timeWindow"
        FROM "Stop"
        WHERE "id" = ${payload.stopId}::uuid
        AND "organizationId" = ${organizationId}::uuid
        LIMIT 1
      `),
      this.prisma.$queryRaw<
        Array<{
          id: string;
          state: string;
          shiftStartSeconds: number | null;
          shiftEndSeconds: number | null;
          startLocation: Prisma.JsonValue | null;
        }>
      >(Prisma.sql`
        SELECT "id", "state"::text AS "state", "shiftStartSeconds", "shiftEndSeconds", "startLocation"
        FROM "Driver"
        WHERE "id" = ${payload.driverId}::uuid
        AND "organizationId" = ${organizationId}::uuid
        AND "deletedAt" IS NULL
        LIMIT 1
      `),
      payload.vehicleId
        ? this.prisma.$queryRaw<
            Array<{
              id: string;
              capacity: Prisma.JsonValue | null;
              skills: Prisma.JsonValue | null;
            }>
          >(Prisma.sql`
            SELECT "id", "capacity", "skills"
            FROM "Vehicle"
            WHERE "id" = ${payload.vehicleId}::uuid
            AND "organizationId" = ${organizationId}::uuid
            LIMIT 1
          `)
        : Promise.resolve([]),
    ]);

    const stop = stopRows[0];
    if (!stop) {
      throw new BadRequestException('Stop is not available in the active organization');
    }

    return {
      stop,
      driver: this.ensureDriver(driverRows),
      vehicle: vehicleRows[0] ?? null,
    };
  }

  private evaluateRouteRules(context: {
    driver: {
      state: string;
      shiftStartSeconds: number | null;
      shiftEndSeconds: number | null;
    };
    vehicle: { capacity: Prisma.JsonValue | null; skills: Prisma.JsonValue | null } | null;
    stopCount: number;
    requiredSkillsByStop: Prisma.JsonValue | null;
  }): DispatchRuleDecision {
    const reasons: string[] = [];

    this.validateShiftWindow(
      context.driver.shiftStartSeconds,
      context.driver.shiftEndSeconds,
      reasons,
    );

    if (context.driver.state === 'failed') {
      reasons.push('driver state is failed');
    }

    const vehicleMaxStops = this.readNumericFromJson(
      context.vehicle?.capacity,
      'maxStops',
    );
    if (vehicleMaxStops !== null && context.stopCount > vehicleMaxStops) {
      reasons.push(
        `vehicle maxStops ${vehicleMaxStops} is lower than route stops ${context.stopCount}`,
      );
    }

    const requiredSkills = this.flattenRequiredSkills(context.requiredSkillsByStop);
    if (requiredSkills.length > 0) {
      const vehicleSkills = this.readStringArrayFromJson(context.vehicle?.skills);
      const missing = requiredSkills.filter((skill) => !vehicleSkills.includes(skill));
      if (missing.length > 0) {
        reasons.push(`vehicle missing required skills: ${missing.join(', ')}`);
      }
    }

    return {
      accepted: reasons.length === 0,
      reasons,
    };
  }

  private evaluateStopRules(context: {
    stop: { location: Prisma.JsonValue; timeWindow: Prisma.JsonValue | null };
    driver: {
      state: string;
      shiftStartSeconds: number | null;
      shiftEndSeconds: number | null;
      startLocation: Prisma.JsonValue | null;
    };
    vehicle: { capacity: Prisma.JsonValue | null; skills: Prisma.JsonValue | null } | null;
  }): DispatchRuleDecision {
    const reasons: string[] = [];

    this.validateShiftWindow(
      context.driver.shiftStartSeconds,
      context.driver.shiftEndSeconds,
      reasons,
    );

    const requiredSkills = this.requiredSkillsFromStop(context.stop.timeWindow);
    if (requiredSkills.length > 0) {
      const vehicleSkills = this.readStringArrayFromJson(context.vehicle?.skills);
      const missing = requiredSkills.filter((skill) => !vehicleSkills.includes(skill));
      if (missing.length > 0) {
        reasons.push(`vehicle missing required skills: ${missing.join(', ')}`);
      }
    }

    const maxDistanceKm =
      this.readNumericFromJson(context.vehicle?.capacity, 'maxDistanceKm') ??
      Number(process.env.DISPATCH_MAX_DISTANCE_KM ?? 100);

    const driverStart = this.asLocationOrNull(context.driver.startLocation);
    const stopLocation = this.asLocationOrNull(context.stop.location);

    if (driverStart && stopLocation) {
      const distanceKm = this.haversineKm(driverStart, stopLocation);
      if (distanceKm > maxDistanceKm) {
        reasons.push(
          `driver distance ${distanceKm.toFixed(1)}km exceeds maxDistanceKm ${maxDistanceKm}`,
        );
      }
    }

    return {
      accepted: reasons.length === 0,
      reasons,
    };
  }

  private validateShiftWindow(
    shiftStartSeconds: number | null,
    shiftEndSeconds: number | null,
    reasons: string[],
  ) {
    if (
      Number.isFinite(shiftStartSeconds) &&
      Number.isFinite(shiftEndSeconds)
    ) {
      const now = new Date();
      const nowSeconds =
        now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
      if (nowSeconds < shiftStartSeconds! || nowSeconds > shiftEndSeconds!) {
        reasons.push('driver is outside shift window');
      }
    }
  }

  private ensureDriver(
    rows: Array<{
      id: string;
      state: string;
      shiftStartSeconds: number | null;
      shiftEndSeconds: number | null;
      startLocation: Prisma.JsonValue | null;
    }>,
  ) {
    const driver = rows[0];
    if (!driver) {
      throw new BadRequestException(
        'Driver is not available in the active organization',
      );
    }
    return driver;
  }

  private flattenRequiredSkills(value: Prisma.JsonValue | null): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const all: string[] = [];
    for (const entry of value) {
      if (Array.isArray(entry)) {
        for (const skill of entry) {
          if (typeof skill === 'string' && skill.trim()) {
            all.push(skill.trim());
          }
        }
      }
    }
    return [...new Set(all)];
  }

  private requiredSkillsFromStop(value: Prisma.JsonValue | null): string[] {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return [];
    }

    const raw = (value as Record<string, unknown>).requiredSkills;
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .filter((entry) => typeof entry === 'string' && entry.trim())
      .map((entry) => String(entry).trim());
  }

  private readStringArrayFromJson(
    value: Prisma.JsonValue | null | undefined,
  ): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((entry) => typeof entry === 'string' && entry.trim())
      .map((entry) => String(entry).trim());
  }

  private readNumericFromJson(
    value: Prisma.JsonValue | null | undefined,
    key: string,
  ): number | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const raw = (value as Record<string, unknown>)[key];
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  }

  private asLocationOrNull(value: Prisma.JsonValue | null): [number, number] | null {
    if (!Array.isArray(value) || value.length !== 2) {
      return null;
    }
    const [lon, lat] = value as number[];
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      return null;
    }
    return [lon, lat];
  }

  private haversineKm(a: [number, number], b: [number, number]): number {
    const toRad = (n: number) => (n * Math.PI) / 180;
    const dLat = toRad(b[1] - a[1]);
    const dLon = toRad(b[0] - a[0]);
    const lat1 = toRad(a[1]);
    const lat2 = toRad(b[1]);

    const p =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(p), Math.sqrt(1 - p));
    return 6371 * c;
  }

  private async writeDecisionEvent(
    ownerUserId: string,
    organizationId: string,
    eventType: string,
    entityId: string,
    payload: unknown,
    decision: DispatchRuleDecision,
  ) {
    await this.prisma.$executeRaw`
      INSERT INTO "ExecutionEvent"
        ("id", "ownerUserId", "organizationId", "eventType", "entityId", "data", "createdAt")
      VALUES
        (
          ${randomUUID()}::uuid,
          ${ownerUserId}::uuid,
          ${organizationId}::uuid,
          ${eventType},
          ${entityId}::uuid,
          ${JSON.stringify({ payload, decision })}::jsonb,
          NOW()
        )
    `;
  }
}
