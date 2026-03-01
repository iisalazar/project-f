import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateDriverDto } from './dto/create-driver.dto';
import type { UpdateDriverDto } from './dto/update-driver.dto';

interface DriverRow {
  id: string;
  organizationId: string;
  userId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  state: string;
  shiftStartSeconds: number | null;
  shiftEndSeconds: number | null;
  startLocation: Prisma.JsonValue | null;
  endLocation: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, payload: CreateDriverDto) {
    if (!payload?.name?.trim()) {
      throw new BadRequestException('name is required');
    }

    this.validateOptionalLocation(payload.startLocation, 'startLocation');
    this.validateOptionalLocation(payload.endLocation, 'endLocation');

    const email = payload.email?.trim() || null;
    const shouldCreateLogin = Boolean(payload.createLoginUser);
    if (shouldCreateLogin && !email) {
      throw new BadRequestException(
        'email is required when createLoginUser is enabled',
      );
    }

    const rows = await this.prisma.$transaction(async (tx) => {
      let userId: string | null = null;
      if (shouldCreateLogin && email) {
        const user = await tx.user.upsert({
          where: { email },
          update: {},
          create: { email },
          select: { id: true },
        });
        userId = user.id;

        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "OrganizationUserRole" ("id", "organizationId", "userId", "role", "status", "createdAt")
          VALUES (gen_random_uuid(), ${organizationId}::uuid, ${userId}::uuid, 'driver', 'active', NOW())
          ON CONFLICT ("organizationId", "userId") DO NOTHING
        `);
      }

      return tx.$queryRaw<DriverRow[]>(Prisma.sql`
        INSERT INTO "Driver"
          ("id", "organizationId", "userId", "name", "email", "phone", "state", "shiftStartSeconds", "shiftEndSeconds", "startLocation", "endLocation", "createdAt", "updatedAt")
        VALUES
          (
            gen_random_uuid(),
            ${organizationId}::uuid,
            ${userId}::uuid,
            ${payload.name.trim()},
            ${email},
            ${payload.phone?.trim() || null},
            (${payload.state ?? 'idle'})::"DriverState",
            ${payload.shiftStartSeconds ?? null},
            ${payload.shiftEndSeconds ?? null},
            ${payload.startLocation ? JSON.stringify(payload.startLocation) : null}::jsonb,
            ${payload.endLocation ? JSON.stringify(payload.endLocation) : null}::jsonb,
            NOW(),
            NOW()
          )
        RETURNING *
      `);
    });

    return this.toPublic(rows[0]);
  }

  async list(
    organizationId: string,
    params: {
      search?: string;
      state?: string;
      page?: number;
      pageSize?: number;
      linkedUserId?: string;
    },
  ) {
    const pageSize = Math.min(Math.max(Number(params.pageSize ?? 20), 1), 100);
    const page = Math.max(Number(params.page ?? 1), 1);
    const offset = (page - 1) * pageSize;

    const state = params.state?.trim() || null;
    const search = params.search?.trim() || null;
    const linkedUserId = params.linkedUserId?.trim() || null;
    if (linkedUserId) {
      this.assertUuid(linkedUserId, 'linkedUserId');
    }

    const [items, totalRows] = await Promise.all([
      this.prisma.$queryRaw<DriverRow[]>(Prisma.sql`
        SELECT *
        FROM "Driver"
        WHERE "organizationId" = ${organizationId}::uuid
          AND "deletedAt" IS NULL
          AND (${linkedUserId}::text IS NULL OR "userId" = ${linkedUserId}::uuid)
          AND (${state}::text IS NULL OR "state" = (${state})::"DriverState")
          AND (
            ${search}::text IS NULL
            OR "name" ILIKE ('%' || ${search} || '%')
            OR COALESCE("email", '') ILIKE ('%' || ${search} || '%')
            OR COALESCE("phone", '') ILIKE ('%' || ${search} || '%')
          )
        ORDER BY "createdAt" DESC
        LIMIT ${pageSize}
        OFFSET ${offset}
      `),
      this.prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM "Driver"
        WHERE "organizationId" = ${organizationId}::uuid
          AND "deletedAt" IS NULL
          AND (${linkedUserId}::text IS NULL OR "userId" = ${linkedUserId}::uuid)
          AND (${state}::text IS NULL OR "state" = (${state})::"DriverState")
          AND (
            ${search}::text IS NULL
            OR "name" ILIKE ('%' || ${search} || '%')
            OR COALESCE("email", '') ILIKE ('%' || ${search} || '%')
            OR COALESCE("phone", '') ILIKE ('%' || ${search} || '%')
          )
      `),
    ]);

    return {
      items: items.map((item) => this.toPublic(item)),
      total: Number(totalRows[0]?.total ?? 0),
      page,
      pageSize,
    };
  }

  async getById(organizationId: string, driverId: string) {
    this.assertUuid(driverId, 'driverId');
    const rows = await this.prisma.$queryRaw<DriverRow[]>(Prisma.sql`
      SELECT *
      FROM "Driver"
      WHERE "id" = ${driverId}::uuid
        AND "organizationId" = ${organizationId}::uuid
        AND "deletedAt" IS NULL
      LIMIT 1
    `);

    if (!rows[0]) {
      throw new NotFoundException('Driver not found');
    }

    return this.toPublic(rows[0]);
  }

  async update(
    organizationId: string,
    driverId: string,
    payload: UpdateDriverDto,
  ) {
    this.assertUuid(driverId, 'driverId');
    this.validateOptionalLocation(payload.startLocation, 'startLocation');
    this.validateOptionalLocation(payload.endLocation, 'endLocation');

    const rows = await this.prisma.$queryRaw<DriverRow[]>(Prisma.sql`
      UPDATE "Driver"
      SET
        "name" = COALESCE(${payload.name?.trim() || null}, "name"),
        "email" = COALESCE(${payload.email?.trim() || null}, "email"),
        "phone" = COALESCE(${payload.phone?.trim() || null}, "phone"),
        "state" = COALESCE((${payload.state || null})::"DriverState", "state"),
        "shiftStartSeconds" = COALESCE(${payload.shiftStartSeconds ?? null}, "shiftStartSeconds"),
        "shiftEndSeconds" = COALESCE(${payload.shiftEndSeconds ?? null}, "shiftEndSeconds"),
        "startLocation" = COALESCE(${payload.startLocation ? JSON.stringify(payload.startLocation) : null}::jsonb, "startLocation"),
        "endLocation" = COALESCE(${payload.endLocation ? JSON.stringify(payload.endLocation) : null}::jsonb, "endLocation"),
        "updatedAt" = NOW()
      WHERE "id" = ${driverId}::uuid
        AND "organizationId" = ${organizationId}::uuid
        AND "deletedAt" IS NULL
      RETURNING *
    `);

    if (!rows[0]) {
      throw new NotFoundException('Driver not found');
    }

    return this.toPublic(rows[0]);
  }

  async remove(organizationId: string, driverId: string) {
    this.assertUuid(driverId, 'driverId');
    const rows = await this.prisma.$queryRaw<DriverRow[]>(Prisma.sql`
      UPDATE "Driver"
      SET "deletedAt" = NOW(), "updatedAt" = NOW()
      WHERE "id" = ${driverId}::uuid
        AND "organizationId" = ${organizationId}::uuid
        AND "deletedAt" IS NULL
      RETURNING *
    `);

    if (!rows[0]) {
      throw new NotFoundException('Driver not found');
    }

    return { success: true };
  }

  private toPublic(row: DriverRow) {
    return {
      id: row.id,
      organizationId: row.organizationId,
      userId: row.userId,
      name: row.name,
      email: row.email,
      phone: row.phone,
      state: row.state,
      shiftStartSeconds: row.shiftStartSeconds,
      shiftEndSeconds: row.shiftEndSeconds,
      startLocation: row.startLocation,
      endLocation: row.endLocation,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
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

  private validateOptionalLocation(value: unknown, label: string) {
    if (value === undefined || value === null) {
      return;
    }

    if (!Array.isArray(value) || value.length !== 2) {
      throw new BadRequestException(`${label} must be [lon, lat]`);
    }

    const [lon, lat] = value as number[];
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      throw new BadRequestException(`${label} must be numbers`);
    }
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
      throw new BadRequestException(`${label} out of range`);
    }
  }
}
