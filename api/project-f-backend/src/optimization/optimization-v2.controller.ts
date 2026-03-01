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
import { CreateV2OptimizationCommand } from './commands/create-v2-optimization.command';
import type { VroomOptimizationRequestDto } from './dto/vroom-optimization.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Controller('v1/optimizations')
@UseGuards(AuthGuard)
export class OptimizationV2Controller {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  async create(@Body() body: VroomOptimizationRequestDto, @Req() request: Request) {
    // @ts-ignore
    const ownerUserId = request.user?.id as string;
    return this.commandBus.execute(new CreateV2OptimizationCommand(body, ownerUserId));
  }

  @Get(':jobId')
  async getStatus(@Req() request: Request, @Param('jobId', new ParseUUIDPipe()) jobId: string) {
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
      throw new NotFoundException('Optimization job not found for current user');
    }

    return {
      ...job,
      error: job.error ?? (job.errorMessage ? { message: job.errorMessage } : null),
    };
  }

  @Get(':jobId/solution')
  async getSolution(@Req() request: Request, @Param('jobId', new ParseUUIDPipe()) jobId: string) {
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
      throw new NotFoundException('Optimization job not found for current user');
    }

    if (!job.result) {
      throw new ConflictException('Solution is not yet available');
    }

    return job.result;
  }
}
