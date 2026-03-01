import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { DriverStopStatusUpdateDto } from './dto/driver.dto';
import { DriverExecutionService } from './services/driver-execution.service';

@Controller('driver')
@UseGuards(AuthGuard)
export class DriverController {
  constructor(private readonly driverExecutionService: DriverExecutionService) {}

  @Get('trip/today')
  async todayTrip(@Req() request: Request) {
    // @ts-ignore
    const ownerUserId = request.user?.id as string;
    return this.driverExecutionService.getTodayTrip(ownerUserId);
  }

  @Get('stops')
  async stops(@Req() request: Request) {
    // @ts-ignore
    const ownerUserId = request.user?.id as string;
    return this.driverExecutionService.listDriverStops(ownerUserId);
  }

  @Post('stops/:id/status')
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
