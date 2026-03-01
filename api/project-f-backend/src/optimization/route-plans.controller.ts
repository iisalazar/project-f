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
import { Roles } from '../auth/decorators/roles.decorator';
import { RoutePlansService } from './services/route-plans.service';
import type {
  AssignRoutePlanDriverDto,
  ReorderRouteStopsDto,
} from './dto/route-plans.dto';

@Controller('route-plans')
@UseGuards(AuthGuard, OrganizationAccessGuard, RolesGuard)
export class RoutePlansController {
  constructor(private readonly routePlansService: RoutePlansService) {}

  @Get()
  @Roles('org_admin', 'dispatcher', 'viewer', 'driver')
  async list(
    @Req() request: Request,
    @Query('date') date?: string,
    @Query('status') status?: string,
    @Query('driverId') driverId?: string,
  ) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    // @ts-ignore
    const activeRole = request.authContext.activeRole as string | null;
    // @ts-ignore
    const actorUserId = request.user?.id as string;
    return this.routePlansService.list(organizationId, {
      date,
      status,
      driverId,
      actorUserId,
      restrictToActorDriver: activeRole === 'driver',
    });
  }

  @Get(':id')
  @Roles('org_admin', 'dispatcher', 'viewer', 'driver')
  async getById(@Req() request: Request, @Param('id') id: string) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    // @ts-ignore
    const activeRole = request.authContext.activeRole as string | null;
    // @ts-ignore
    const actorUserId = request.user?.id as string;
    return this.routePlansService.getById(
      organizationId,
      id,
      actorUserId,
      activeRole === 'driver',
    );
  }

  @Get(':id/stops')
  @Roles('org_admin', 'dispatcher', 'viewer', 'driver')
  async listStops(@Req() request: Request, @Param('id') id: string) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    // @ts-ignore
    const activeRole = request.authContext.activeRole as string | null;
    // @ts-ignore
    const actorUserId = request.user?.id as string;
    return this.routePlansService.listStops(
      organizationId,
      id,
      actorUserId,
      activeRole === 'driver',
    );
  }

  @Post(':id/assign-driver')
  @Roles('org_admin', 'dispatcher')
  async assignDriver(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: AssignRoutePlanDriverDto,
  ) {
    // @ts-ignore
    const ownerUserId = request.user?.id as string;
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.routePlansService.assignDriver(
      ownerUserId,
      organizationId,
      id,
      body,
    );
  }

  @Post(':id/reorder-stops')
  @Roles('org_admin', 'dispatcher')
  async reorderStops(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: ReorderRouteStopsDto,
  ) {
    // @ts-ignore
    const ownerUserId = request.user?.id as string;
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.routePlansService.reorderStops(
      ownerUserId,
      organizationId,
      id,
      body,
    );
  }
}
