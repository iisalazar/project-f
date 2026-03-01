import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
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
  constructor(private readonly driverExecutionService: DriverExecutionService) {}

  @Get('trip/today')
  @Roles('driver', 'org_admin', 'dispatcher')
  async todayTrip(@Req() request: Request) {
    // @ts-ignore
    const ownerUserId = request.user?.id as string;
    return this.driverExecutionService.getTodayTrip(ownerUserId);
  }

  @Get('stops')
  @Roles('driver', 'org_admin', 'dispatcher')
  async stops(@Req() request: Request) {
    // @ts-ignore
    const ownerUserId = request.user?.id as string;
    return this.driverExecutionService.listDriverStops(ownerUserId);
  }

  @Post('stops/:id/status')
  @Roles('driver', 'org_admin', 'dispatcher')
  async updateStopStatus(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() payload: DriverStopStatusUpdateDto,
  ) {
    // @ts-ignore
    const ownerUserId = request.user?.id as string;
    return this.driverExecutionService.updateStopStatus(ownerUserId, id, payload);
  }
}
