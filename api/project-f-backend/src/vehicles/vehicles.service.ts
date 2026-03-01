import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateVehicleDto } from './dto/create-vehicle.dto';
import type { UpdateVehicleDto } from './dto/update-vehicle.dto';

export interface VehicleRow {
  id: string;
  organizationId: string;
  name: string;
  capacity: Prisma.JsonValue | null;
  skills: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, payload: CreateVehicleDto) {
    if (!payload?.name?.trim()) {
      throw new BadRequestException('name is required');
    }

    this.validateSkills(payload.skills);

    const rows = await this.prisma.$queryRaw<VehicleRow[]>(Prisma.sql`
      INSERT INTO "Vehicle"
        ("id", "organizationId", "name", "capacity", "skills", "createdAt", "updatedAt")
      VALUES
        (
          gen_random_uuid(),
          ${organizationId}::uuid,
          ${payload.name.trim()},
          ${payload.capacity ? JSON.stringify(payload.capacity) : null}::jsonb,
          ${payload.skills ? JSON.stringify(payload.skills) : null}::jsonb,
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
      this.prisma.$queryRaw<VehicleRow[]>(Prisma.sql`
        SELECT *
        FROM "Vehicle"
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
        FROM "Vehicle"
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

  async getById(organizationId: string, vehicleId: string) {
    this.assertUuid(vehicleId, 'id');

    const rows = await this.prisma.$queryRaw<VehicleRow[]>(Prisma.sql`
      SELECT *
      FROM "Vehicle"
      WHERE "id" = ${vehicleId}::uuid
        AND "organizationId" = ${organizationId}::uuid
      LIMIT 1
    `);

    if (!rows[0]) {
      throw new NotFoundException('Vehicle not found');
    }

    return rows[0];
  }

  async update(
    organizationId: string,
    vehicleId: string,
    payload: UpdateVehicleDto,
  ) {
    this.assertUuid(vehicleId, 'id');
    this.validateSkills(payload.skills);

    const rows = await this.prisma.$queryRaw<VehicleRow[]>(Prisma.sql`
      UPDATE "Vehicle"
      SET
        "name" = COALESCE(${payload.name?.trim() || null}, "name"),
        "capacity" = COALESCE(${payload.capacity ? JSON.stringify(payload.capacity) : null}::jsonb, "capacity"),
        "skills" = COALESCE(${payload.skills ? JSON.stringify(payload.skills) : null}::jsonb, "skills"),
        "updatedAt" = NOW()
      WHERE "id" = ${vehicleId}::uuid
        AND "organizationId" = ${organizationId}::uuid
      RETURNING *
    `);

    if (!rows[0]) {
      throw new NotFoundException('Vehicle not found');
    }

    return rows[0];
  }

  async remove(organizationId: string, vehicleId: string) {
    this.assertUuid(vehicleId, 'id');

    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      DELETE FROM "Vehicle"
      WHERE "id" = ${vehicleId}::uuid
        AND "organizationId" = ${organizationId}::uuid
      RETURNING "id"
    `);

    if (!rows[0]) {
      throw new NotFoundException('Vehicle not found');
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

  private validateSkills(value: unknown) {
    if (value === undefined || value === null) {
      return;
    }

    if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
      throw new BadRequestException('skills must be an array of strings');
    }
  }
}
