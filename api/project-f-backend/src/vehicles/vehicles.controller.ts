import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationAccessGuard } from '../auth/guards/organization-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { CreateVehicleDto } from './dto/create-vehicle.dto';
import type { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@Controller('vehicles')
@UseGuards(AuthGuard, OrganizationAccessGuard, RolesGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @Roles('org_admin', 'dispatcher')
  async create(@Req() request: Request, @Body() body: CreateVehicleDto) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.vehiclesService.create(organizationId, body);
  }

  @Get()
  @Roles('org_admin', 'dispatcher', 'viewer')
  async list(
    @Req() request: Request,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.vehiclesService.list(organizationId, {
      search,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  @Roles('org_admin', 'dispatcher', 'viewer')
  async get(@Req() request: Request, @Param('id') id: string) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.vehiclesService.getById(organizationId, id);
  }

  @Patch(':id')
  @Roles('org_admin', 'dispatcher')
  async update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: UpdateVehicleDto,
  ) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.vehiclesService.update(organizationId, id, body);
  }

  @Delete(':id')
  @Roles('org_admin', 'dispatcher')
  async remove(@Req() request: Request, @Param('id') id: string) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.vehiclesService.remove(organizationId, id);
  }
}
