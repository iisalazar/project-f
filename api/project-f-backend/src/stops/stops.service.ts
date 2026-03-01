import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateStopDto } from './dto/create-stop.dto';
import type { UpdateStopDto } from './dto/update-stop.dto';

export interface StopRow {
  id: string;
  organizationId: string;
  externalRef: string | null;
  location: Prisma.JsonValue;
  serviceSeconds: number | null;
  timeWindow: Prisma.JsonValue | null;
  priority: number | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class StopsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, payload: CreateStopDto) {
    this.validateLocation(payload?.location, 'location');
    this.validateServiceSeconds(payload.serviceSeconds);
    this.validatePriority(payload.priority);

    const rows = await this.prisma.$queryRaw<StopRow[]>(Prisma.sql`
      INSERT INTO "Stop"
        ("id", "organizationId", "externalRef", "location", "serviceSeconds", "timeWindow", "priority", "createdAt", "updatedAt")
      VALUES
        (
          gen_random_uuid(),
          ${organizationId}::uuid,
          ${payload.externalRef?.trim() || null},
          ${JSON.stringify(payload.location)}::jsonb,
          ${payload.serviceSeconds ?? null},
          ${payload.timeWindow ? JSON.stringify(payload.timeWindow) : null}::jsonb,
          ${payload.priority ?? null},
          NOW(),
          NOW()
        )
      RETURNING *
    `);

    return rows[0];
  }

  async list(
    organizationId: string,
    params: {
      search?: string;
      externalRef?: string;
      priorityMin?: number;
      priorityMax?: number;
      page?: number;
      pageSize?: number;
    },
  ) {
    const pageSize = Math.min(Math.max(Number(params.pageSize ?? 20), 1), 100);
    const page = Math.max(Number(params.page ?? 1), 1);
    const offset = (page - 1) * pageSize;
    const search = params.search?.trim() || null;
    const externalRef = params.externalRef?.trim() || null;
    const priorityMin =
      params.priorityMin === undefined ? null : Number(params.priorityMin);
    const priorityMax =
      params.priorityMax === undefined ? null : Number(params.priorityMax);

    if (priorityMin !== null && !Number.isInteger(priorityMin)) {
      throw new BadRequestException('priorityMin must be an integer');
    }
    if (priorityMax !== null && !Number.isInteger(priorityMax)) {
      throw new BadRequestException('priorityMax must be an integer');
    }
    if (
      priorityMin !== null &&
      priorityMax !== null &&
      priorityMin > priorityMax
    ) {
      throw new BadRequestException(
        'priorityMin must be less than or equal to priorityMax',
      );
    }

    const [items, totalRows] = await Promise.all([
      this.prisma.$queryRaw<StopRow[]>(Prisma.sql`
        SELECT *
        FROM "Stop"
        WHERE "organizationId" = ${organizationId}::uuid
          AND (${externalRef}::text IS NULL OR "externalRef" = ${externalRef})
          AND (${priorityMin}::int IS NULL OR "priority" >= ${priorityMin})
          AND (${priorityMax}::int IS NULL OR "priority" <= ${priorityMax})
          AND (
            ${search}::text IS NULL
            OR COALESCE("externalRef", '') ILIKE ('%' || ${search} || '%')
          )
        ORDER BY "createdAt" DESC
        LIMIT ${pageSize}
        OFFSET ${offset}
      `),
      this.prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM "Stop"
        WHERE "organizationId" = ${organizationId}::uuid
          AND (${externalRef}::text IS NULL OR "externalRef" = ${externalRef})
          AND (${priorityMin}::int IS NULL OR "priority" >= ${priorityMin})
          AND (${priorityMax}::int IS NULL OR "priority" <= ${priorityMax})
          AND (
            ${search}::text IS NULL
            OR COALESCE("externalRef", '') ILIKE ('%' || ${search} || '%')
          )
      `),
    ]);

    return {
      items,
      total: Number(totalRows[0]?.total ?? 0),
      page,
      pageSize,
    };
  }

  async getById(organizationId: string, stopId: string) {
    this.assertUuid(stopId, 'id');

    const rows = await this.prisma.$queryRaw<StopRow[]>(Prisma.sql`
      SELECT *
      FROM "Stop"
      WHERE "id" = ${stopId}::uuid
        AND "organizationId" = ${organizationId}::uuid
      LIMIT 1
    `);

    if (!rows[0]) {
      throw new NotFoundException('Stop not found');
    }

    return rows[0];
  }

  async update(organizationId: string, stopId: string, payload: UpdateStopDto) {
    this.assertUuid(stopId, 'id');
    this.validateOptionalLocation(payload.location, 'location');
    this.validateServiceSeconds(payload.serviceSeconds);
    this.validatePriority(payload.priority);

    const rows = await this.prisma.$queryRaw<StopRow[]>(Prisma.sql`
      UPDATE "Stop"
      SET
        "externalRef" = COALESCE(${payload.externalRef?.trim() || null}, "externalRef"),
        "location" = COALESCE(${payload.location ? JSON.stringify(payload.location) : null}::jsonb, "location"),
        "serviceSeconds" = COALESCE(${payload.serviceSeconds ?? null}, "serviceSeconds"),
        "timeWindow" = COALESCE(${payload.timeWindow ? JSON.stringify(payload.timeWindow) : null}::jsonb, "timeWindow"),
        "priority" = COALESCE(${payload.priority ?? null}, "priority"),
        "updatedAt" = NOW()
      WHERE "id" = ${stopId}::uuid
        AND "organizationId" = ${organizationId}::uuid
      RETURNING *
    `);

    if (!rows[0]) {
      throw new NotFoundException('Stop not found');
    }

    return rows[0];
  }

  async remove(organizationId: string, stopId: string) {
    this.assertUuid(stopId, 'id');

    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      DELETE FROM "Stop"
      WHERE "id" = ${stopId}::uuid
        AND "organizationId" = ${organizationId}::uuid
      RETURNING "id"
    `);

    if (!rows[0]) {
      throw new NotFoundException('Stop not found');
    }

    return { success: true };
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

  private validateServiceSeconds(value: unknown) {
    if (value === undefined || value === null) {
      return;
    }
    if (!Number.isInteger(value) || Number(value) < 0) {
      throw new BadRequestException('serviceSeconds must be a non-negative integer');
    }
  }

  private validatePriority(value: unknown) {
    if (value === undefined || value === null) {
      return;
    }
    if (!Number.isInteger(value)) {
      throw new BadRequestException('priority must be an integer');
    }
  }

  private validateOptionalLocation(value: unknown, field: string) {
    if (value === undefined || value === null) {
      return;
    }
    this.validateLocation(value, field);
  }

  private validateLocation(value: unknown, field: string) {
    if (!Array.isArray(value) || value.length !== 2) {
      throw new BadRequestException(`${field} must be [lon, lat]`);
    }

    const [lon, lat] = value as number[];
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      throw new BadRequestException(`${field} must be numbers`);
    }
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
      throw new BadRequestException(`${field} out of range`);
    }
  }
}
