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
import type { CreateStopDto } from './dto/create-stop.dto';
import type { UpdateStopDto } from './dto/update-stop.dto';
import { StopsService } from './stops.service';

@Controller('stops')
@UseGuards(AuthGuard, OrganizationAccessGuard, RolesGuard)
export class StopsController {
  constructor(private readonly stopsService: StopsService) {}

  @Post()
  @Roles('org_admin', 'dispatcher')
  async create(@Req() request: Request, @Body() body: CreateStopDto) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.stopsService.create(organizationId, body);
  }

  @Get()
  @Roles('org_admin', 'dispatcher', 'viewer')
  async list(
    @Req() request: Request,
    @Query('search') search?: string,
    @Query('externalRef') externalRef?: string,
    @Query('priorityMin') priorityMin?: string,
    @Query('priorityMax') priorityMax?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.stopsService.list(organizationId, {
      search,
      externalRef,
      priorityMin: priorityMin ? Number(priorityMin) : undefined,
      priorityMax: priorityMax ? Number(priorityMax) : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  @Roles('org_admin', 'dispatcher', 'viewer')
  async get(@Req() request: Request, @Param('id') id: string) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.stopsService.getById(organizationId, id);
  }

  @Patch(':id')
  @Roles('org_admin', 'dispatcher')
  async update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: UpdateStopDto,
  ) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.stopsService.update(organizationId, id, body);
  }

  @Delete(':id')
  @Roles('org_admin', 'dispatcher')
  async remove(@Req() request: Request, @Param('id') id: string) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.stopsService.remove(organizationId, id);
  }
}
