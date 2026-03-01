import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationAccessGuard } from '../auth/guards/organization-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type {
  DispatchRouteRequestDto,
  DispatchStopRequestDto,
} from './dto/dispatch.dto';
import { DispatchService } from './services/dispatch.service';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('dispatch')
@UseGuards(AuthGuard, OrganizationAccessGuard, RolesGuard)
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post('route')
  @Roles('org_admin', 'dispatcher')
  async dispatchRoute(
    @Body() payload: DispatchRouteRequestDto,
    @Req() request: Request,
  ) {
    // @ts-ignore
    const ownerUserId = request.user?.id as string;
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.dispatchService.dispatchRoute(
      ownerUserId,
      organizationId,
      payload,
    );
  }

  @Post('stop')
  @Roles('org_admin', 'dispatcher')
  async dispatchStop(
    @Body() payload: DispatchStopRequestDto,
    @Req() request: Request,
  ) {
    // @ts-ignore
    const ownerUserId = request.user?.id as string;
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.dispatchService.dispatchStop(
      ownerUserId,
      organizationId,
      payload,
    );
  }
}
