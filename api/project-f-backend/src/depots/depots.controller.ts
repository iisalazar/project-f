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
import type { CreateDepotDto } from './dto/create-depot.dto';
import type { UpdateDepotDto } from './dto/update-depot.dto';
import { DepotsService } from './depots.service';

@Controller('depots')
@UseGuards(AuthGuard, OrganizationAccessGuard, RolesGuard)
export class DepotsController {
  constructor(private readonly depotsService: DepotsService) {}

  @Post()
  @Roles('org_admin', 'dispatcher')
  async create(@Req() request: Request, @Body() body: CreateDepotDto) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.depotsService.create(organizationId, body);
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
    return this.depotsService.list(organizationId, {
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
    return this.depotsService.getById(organizationId, id);
  }

  @Patch(':id')
  @Roles('org_admin', 'dispatcher')
  async update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: UpdateDepotDto,
  ) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.depotsService.update(organizationId, id, body);
  }

  @Delete(':id')
  @Roles('org_admin', 'dispatcher')
  async remove(@Req() request: Request, @Param('id') id: string) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.depotsService.remove(organizationId, id);
  }
}
