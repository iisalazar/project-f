import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateDepotDto } from './dto/create-depot.dto';
import type { UpdateDepotDto } from './dto/update-depot.dto';

export interface DepotRow {
  id: string;
  organizationId: string;
  name: string;
  location: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class DepotsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, payload: CreateDepotDto) {
    if (!payload?.name?.trim()) {
      throw new BadRequestException('name is required');
    }
    this.validateLocation(payload.location, 'location');

    const rows = await this.prisma.$queryRaw<DepotRow[]>(Prisma.sql`
      INSERT INTO "Depot"
        ("id", "organizationId", "name", "location", "createdAt", "updatedAt")
      VALUES
        (
          gen_random_uuid(),
          ${organizationId}::uuid,
          ${payload.name.trim()},
          ${JSON.stringify(payload.location)}::jsonb,
          NOW(),
          NOW()
        )
      RETURNING *
    `);

    return rows[0];
  }

  async list(
    organizationId: string,
    params: { search?: string; page?: number; pageSize?: number },
  ) {
    const pageSize = Math.min(Math.max(Number(params.pageSize ?? 20), 1), 100);
    const page = Math.max(Number(params.page ?? 1), 1);
    const offset = (page - 1) * pageSize;
    const search = params.search?.trim() || null;

    const [items, totalRows] = await Promise.all([
      this.prisma.$queryRaw<DepotRow[]>(Prisma.sql`
        SELECT *
        FROM "Depot"
        WHERE "organizationId" = ${organizationId}::uuid
          AND (
            ${search}::text IS NULL
            OR "name" ILIKE ('%' || ${search} || '%')
          )
        ORDER BY "createdAt" DESC
        LIMIT ${pageSize}
        OFFSET ${offset}
      `),
      this.prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM "Depot"
        WHERE "organizationId" = ${organizationId}::uuid
          AND (
            ${search}::text IS NULL
            OR "name" ILIKE ('%' || ${search} || '%')
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

  async getById(organizationId: string, depotId: string) {
    this.assertUuid(depotId, 'id');

    const rows = await this.prisma.$queryRaw<DepotRow[]>(Prisma.sql`
      SELECT *
      FROM "Depot"
      WHERE "id" = ${depotId}::uuid
        AND "organizationId" = ${organizationId}::uuid
      LIMIT 1
    `);

    if (!rows[0]) {
      throw new NotFoundException('Depot not found');
    }

    return rows[0];
  }

  async update(organizationId: string, depotId: string, payload: UpdateDepotDto) {
    this.assertUuid(depotId, 'id');
    this.validateOptionalLocation(payload.location, 'location');

    const rows = await this.prisma.$queryRaw<DepotRow[]>(Prisma.sql`
      UPDATE "Depot"
      SET
        "name" = COALESCE(${payload.name?.trim() || null}, "name"),
        "location" = COALESCE(${payload.location ? JSON.stringify(payload.location) : null}::jsonb, "location"),
        "updatedAt" = NOW()
      WHERE "id" = ${depotId}::uuid
        AND "organizationId" = ${organizationId}::uuid
      RETURNING *
    `);

    if (!rows[0]) {
      throw new NotFoundException('Depot not found');
    }

    return rows[0];
  }

  async remove(organizationId: string, depotId: string) {
    this.assertUuid(depotId, 'id');

    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      DELETE FROM "Depot"
      WHERE "id" = ${depotId}::uuid
        AND "organizationId" = ${organizationId}::uuid
      RETURNING "id"
    `);

    if (!rows[0]) {
      throw new NotFoundException('Depot not found');
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
