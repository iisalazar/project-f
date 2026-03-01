import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationAccessGuard } from '../auth/guards/organization-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { CreateDriverDto } from './dto/create-driver.dto';
import type { UpdateDriverDto } from './dto/update-driver.dto';
import { DriversService } from './drivers.service';

@Controller('drivers')
@UseGuards(AuthGuard, OrganizationAccessGuard, RolesGuard)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  @Roles('org_admin', 'dispatcher')
  async create(@Req() request: Request, @Body() body: CreateDriverDto) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.driversService.create(organizationId, body);
  }

  @Get()
  @Roles('org_admin', 'dispatcher', 'viewer', 'driver')
  async list(
    @Req() request: Request,
    @Query('search') search?: string,
    @Query('state') state?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.driversService.list(organizationId, {
      search,
      state,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  @Roles('org_admin', 'dispatcher', 'viewer', 'driver')
  async get(@Req() request: Request, @Param('id') id: string) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.driversService.getById(organizationId, id);
  }

  @Patch(':id')
  @Roles('org_admin', 'dispatcher')
  async update(@Req() request: Request, @Param('id') id: string, @Body() body: UpdateDriverDto) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.driversService.update(organizationId, id, body);
  }

  @Delete(':id')
  @Roles('org_admin', 'dispatcher')
  async remove(@Req() request: Request, @Param('id') id: string) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.driversService.remove(organizationId, id);
  }
}
