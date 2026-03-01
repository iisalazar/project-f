import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthContext, OrganizationMembership } from '../auth.types';
import type { CreateOrganizationRequestDto } from '../dto/create-organization.dto';

@Injectable()
export class OrganizationMembershipService {
  constructor(private readonly prisma: PrismaService) {}

  async listMemberships(userId: string): Promise<OrganizationMembership[]> {
    return this.prisma.$queryRaw<OrganizationMembership[]>(Prisma.sql`
      SELECT
        our."organizationId" AS "organizationId",
        o."name" AS "organizationName",
        o."timezone" AS "timezone",
        our."role" AS "role",
        our."status" AS "status"
      FROM "OrganizationUserRole" our
      JOIN "Organization" o ON o."id" = our."organizationId"
      WHERE our."userId" = ${userId}::uuid
      ORDER BY o."createdAt" ASC
    `);
  }

  async resolveAuthContext(userId: string, sessionToken: string): Promise<AuthContext> {
    const [memberships, sessionRows] = await Promise.all([
      this.listMemberships(userId),
      this.prisma.$queryRaw<Array<{ activeOrganizationId: string | null }>>(Prisma.sql`
        SELECT "activeOrganizationId"
        FROM "UserSessionToken"
        WHERE "token" = ${sessionToken}
        LIMIT 1
      `),
    ]);

    const sessionActiveOrganizationId = sessionRows[0]?.activeOrganizationId ?? null;
    const fallbackOrganizationId = memberships.length === 1 ? memberships[0].organizationId : null;
    const activeOrganizationId = sessionActiveOrganizationId ?? fallbackOrganizationId;
    const activeMembership = memberships.find((item) => item.organizationId === activeOrganizationId) ?? null;

    return {
      activeOrganizationId,
      activeRole: activeMembership?.role ?? null,
      memberships,
      needsOnboarding: memberships.length === 0,
    };
  }

  async createOrganizationOnboarding(
    userId: string,
    sessionToken: string,
    payload: CreateOrganizationRequestDto,
  ) {
    if (!payload?.name?.trim()) {
      throw new BadRequestException('Organization name is required');
    }

    const organizationName = payload.name.trim();
    const timezone = payload.timezone?.trim() || 'UTC';

    const orgRows = await this.prisma.$queryRaw<Array<{ id: string; name: string; timezone: string }>>(Prisma.sql`
      INSERT INTO "Organization" ("id", "name", "timezone", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${organizationName}, ${timezone}, NOW(), NOW())
      RETURNING "id", "name", "timezone"
    `);

    const org = orgRows[0];
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO "OrganizationUserRole" ("id", "organizationId", "userId", "role", "status", "createdAt")
      VALUES (gen_random_uuid(), ${org.id}::uuid, ${userId}::uuid, 'org_admin', 'active', NOW())
      ON CONFLICT ("organizationId", "userId") DO UPDATE SET "role" = 'org_admin', "status" = 'active'
    `);

    await this.setActiveOrganization(userId, sessionToken, org.id);

    return {
      organizationId: org.id,
      organizationName: org.name,
      timezone: org.timezone,
      role: 'org_admin' as const,
    };
  }

  async setActiveOrganization(userId: string, sessionToken: string, organizationId: string) {
    const membershipRows = await this.prisma.$queryRaw<Array<{ role: string; status: string }>>(Prisma.sql`
      SELECT "role", "status"
      FROM "OrganizationUserRole"
      WHERE "organizationId" = ${organizationId}::uuid
      AND "userId" = ${userId}::uuid
      LIMIT 1
    `);

    const membership = membershipRows[0];
    if (!membership || membership.status !== 'active') {
      throw new ForbiddenException('User is not an active member of this organization');
    }

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "UserSessionToken"
      SET "activeOrganizationId" = ${organizationId}::uuid,
          "updatedAt" = NOW()
      WHERE "token" = ${sessionToken}
      AND "userId" = ${userId}::uuid
    `);

    return {
      organizationId,
      role: membership.role,
    };
  }
}
