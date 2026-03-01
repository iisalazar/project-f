import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CommandBus } from '@nestjs/cqrs';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationAccessGuard } from '../auth/guards/organization-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateV2OptimizationCommand } from './commands/create-v2-optimization.command';
import type { VroomOptimizationRequestDto } from './dto/vroom-optimization.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';

interface MiddayReplanDto {
  routePlanId: string;
  additionalStopIds?: string[];
}

@Controller('v1/optimizations')
@UseGuards(AuthGuard, OrganizationAccessGuard, RolesGuard)
export class OptimizationV2Controller {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles('org_admin', 'dispatcher')
  async create(
    @Body() body: VroomOptimizationRequestDto,
    @Req() request: Request,
  ) {
    // @ts-ignore
    const ownerUserId = request.user?.id as string;
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.commandBus.execute(
      new CreateV2OptimizationCommand(body, ownerUserId, organizationId),
    );
  }

  @Post('replan-midday')
  @Roles('org_admin', 'dispatcher')
  async replanMidday(@Body() body: MiddayReplanDto, @Req() request: Request) {
    // @ts-ignore
    const ownerUserId = request.user?.id as string;
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;

    const additionalStopIds = Array.isArray(body.additionalStopIds)
      ? body.additionalStopIds.filter((id) => typeof id === 'string')
      : [];

    const [driverRows, stopRows] = await Promise.all([
      this.prisma.$queryRaw<Array<{ driverId: string }>>(Prisma.sql`
        SELECT DISTINCT t."driverId" AS "driverId"
        FROM "Trip" t
        WHERE t."routePlanId" = ${body.routePlanId}::uuid
        AND t."organizationId" = ${organizationId}::uuid
        AND t."driverId" IS NOT NULL
      `),
      additionalStopIds.length > 0
        ? this.prisma.$queryRaw<
            Array<{ id: string; location: Prisma.JsonValue }>
          >(Prisma.sql`
            SELECT "id", "location"
            FROM "Stop"
            WHERE "organizationId" = ${organizationId}::uuid
            AND "id" IN (${Prisma.join(additionalStopIds.map((id) => Prisma.sql`${id}::uuid`))})
          `)
        : Promise.resolve([]),
    ]);

    if (driverRows.length === 0) {
      throw new ConflictException('No assigned drivers found for route plan');
    }

    if (stopRows.length !== additionalStopIds.length) {
      throw new NotFoundException('One or more additionalStopIds were not found');
    }

    const payload: VroomOptimizationRequestDto = {
      selectedDriverIds: driverRows.map((row) => row.driverId),
      jobs: stopRows.map((row, index) => ({
        id: index + 1,
        // @ts-ignore
        location: row.location,
      })),
    };

    return this.commandBus.execute(
      new CreateV2OptimizationCommand(payload, ownerUserId, organizationId),
    );
  }

  @Get(':jobId')
  @Roles('org_admin', 'dispatcher', 'viewer', 'driver')
  async getStatus(
    @Req() request: Request,
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
  ) {
    // @ts-ignore
    const ownerUserId = request.user?.id as string;
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        status: string;
        attempts: number;
        createdAt: Date;
        updatedAt: Date;
        errorMessage: string | null;
        error: Prisma.JsonValue | null;
      }>
    >(Prisma.sql`
      SELECT
        oj."id",
        oj."status",
        COALESCE(oj."attempts", 0) AS "attempts",
        oj."createdAt",
        oj."updatedAt",
        oj."errorMessage",
        oj."error"
      FROM "OptimizationJob" oj
      WHERE oj."id" = ${jobId}::uuid
      AND oj."ownerUserId" = ${ownerUserId}::uuid
      LIMIT 1
    `);
    const job = rows[0];

    if (!job) {
      throw new NotFoundException(
        'Optimization job not found for current user',
      );
    }

    return {
      ...job,
      error:
        job.error ?? (job.errorMessage ? { message: job.errorMessage } : null),
    };
  }

  @Get(':jobId/solution')
  @Roles('org_admin', 'dispatcher', 'viewer', 'driver')
  async getSolution(
    @Req() request: Request,
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
  ) {
    // @ts-ignore
    const ownerUserId = request.user?.id as string;
    const job = await this.prisma.optimizationJob.findFirst({
      where: { id: jobId, ownerUserId },
      select: {
        id: true,
        status: true,
        result: true,
      },
    });

    if (!job) {
      throw new NotFoundException(
        'Optimization job not found for current user',
      );
    }

    if (!job.result) {
      throw new ConflictException('Solution is not yet available');
    }

    return job.result;
  }
}
