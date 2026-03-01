import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationAccessGuard } from '../auth/guards/organization-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { DriverStopStatusUpdateDto } from './dto/driver.dto';
import { DriverExecutionService } from './services/driver-execution.service';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('driver')
@UseGuards(AuthGuard, OrganizationAccessGuard, RolesGuard)
export class DriverController {
  constructor(
    private readonly driverExecutionService: DriverExecutionService,
  ) {}

  @Get('trip/today')
  @Roles('driver')
  async todayTrip(@Req() request: Request) {
    // @ts-ignore
    const actorUserId = request.user?.id as string;
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.driverExecutionService.getTodayTrip(actorUserId, organizationId);
  }

  @Get('stops')
  @Roles('driver')
  async stops(@Req() request: Request, @Query('date') date?: string) {
    // @ts-ignore
    const actorUserId = request.user?.id as string;
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.driverExecutionService.listDriverStops(
      actorUserId,
      organizationId,
      date,
    );
  }

  @Get('trips')
  @Roles('driver')
  async tripsByDate(@Req() request: Request, @Query('date') date: string) {
    // @ts-ignore
    const actorUserId = request.user?.id as string;
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.driverExecutionService.listTripsByDate(
      actorUserId,
      organizationId,
      date,
    );
  }

  @Get('trips/range')
  @Roles('driver')
  async tripsByRange(
    @Req() request: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    // @ts-ignore
    const actorUserId = request.user?.id as string;
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.driverExecutionService.listTripsByDateRange(
      actorUserId,
      organizationId,
      from,
      to,
    );
  }

  @Get('trips/:tripId/stops')
  @Roles('driver')
  async tripStops(@Req() request: Request, @Param('tripId') tripId: string) {
    // @ts-ignore
    const actorUserId = request.user?.id as string;
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.driverExecutionService.listTripStops(
      actorUserId,
      organizationId,
      tripId,
    );
  }

  @Post('stops/:id/status')
  @Roles('driver')
  async updateStopStatus(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() payload: DriverStopStatusUpdateDto,
  ) {
    // @ts-ignore
    const actorUserId = request.user?.id as string;
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.driverExecutionService.updateStopStatus(
      actorUserId,
      organizationId,
      id,
      payload,
    );
  }
}
