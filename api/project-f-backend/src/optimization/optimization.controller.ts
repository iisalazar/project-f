import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CreateOptimizationJobCommand } from './commands/create-optimization-job.command';
import { GetOptimizationJobCommand } from './commands/get-optimization-job.command';
import { ListOptimizationJobsCommand } from './commands/list-optimization-jobs.command';
import type { CreateOptimizationJobRequestDto } from './dto/create-optimization-job.dto';

@ApiTags('optimization')
@Controller('optimization')
@UseGuards(AuthGuard)
export class OptimizationController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Create optimization job' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        drivers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'driver-1' },
              name: { type: 'string', example: 'Juan Dela Cruz' },
              startLocation: { type: 'array', items: { type: 'number' }, example: [121.0437, 14.676] },
              endLocation: { type: 'array', items: { type: 'number' }, example: [121.0437, 14.676] },
              availabilityWindow: { type: 'array', items: { type: 'number' }, example: [28800, 61200] },
              maxTasks: { type: 'number', example: 4 },
            },
            required: ['id', 'name', 'startLocation', 'endLocation'],
          },
        },
        stops: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'stop-1' },
              location: { type: 'array', items: { type: 'number' }, example: [121.0509, 14.5547] },
              serviceSeconds: { type: 'number', example: 300 },
            },
            required: ['id', 'location'],
          },
        },
      },
      required: ['drivers', 'stops'],
      examples: {
        basic: {
          summary: 'Basic request',
          value: {
            drivers: [
              {
                id: 'driver-1',
                name: 'Juan Dela Cruz',
                startLocation: [121.0437, 14.676],
                endLocation: [121.0437, 14.676],
              },
            ],
            stops: [
              { id: 'stop-1', location: [121.0509, 14.5547], serviceSeconds: 300 },
              { id: 'stop-2', location: [121.0600, 14.5600], serviceSeconds: 180 },
            ],
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Job created' })
  @Post('jobs')
  async create(@Body() body: CreateOptimizationJobRequestDto, @Req() request: Request) {
    // @ts-ignore
    const ownerUserId = request.user?.id as string;
    return this.commandBus.execute(new CreateOptimizationJobCommand(body, ownerUserId));
  }

  @ApiOperation({ summary: 'List optimization jobs' })
  @ApiResponse({ status: 200, description: 'Jobs list' })
  @Get('jobs')
  async list(
    @Req() request: Request,
    @Query('status') status?: string,
    @Query('createdAtFrom') createdAtFrom?: string,
    @Query('createdAtTo') createdAtTo?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    // @ts-ignore
    const ownerUserId = request.user?.id as string;
    return this.commandBus.execute(
      new ListOptimizationJobsCommand(ownerUserId, {
        status,
        createdAtFrom,
        createdAtTo,
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
      }),
    );
  }

  @ApiOperation({ summary: 'Get optimization job details' })
  @ApiResponse({ status: 200, description: 'Job details' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiParam({ name: 'jobId', required: true, description: 'Optimization job UUID' })
  @Get('jobs/:jobId')
  async get(
    @Req() request: Request,
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
  ) {
    // @ts-ignore
    const ownerUserId = request.user?.id as string;
    return this.commandBus.execute(new GetOptimizationJobCommand(ownerUserId, jobId));
  }
}
