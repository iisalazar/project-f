import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import type { UpsertNotificationTemplateDto } from './dto/notification-template.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthGuard, OrganizationAccessGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('templates')
  @Roles('org_admin', 'dispatcher', 'viewer')
  async listTemplates(@Req() request: Request) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.notificationsService.listTemplates(organizationId);
  }

  @Post('templates')
  @Roles('org_admin', 'dispatcher')
  async upsertTemplate(
    @Req() request: Request,
    @Body() body: UpsertNotificationTemplateDto,
  ) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.notificationsService.upsertTemplate(organizationId, body);
  }

  @Delete('templates/:id')
  @Roles('org_admin', 'dispatcher')
  async removeTemplate(@Req() request: Request, @Param('id') id: string) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.notificationsService.removeTemplate(organizationId, id);
  }

  @Post('worker/process')
  @Roles('org_admin', 'dispatcher')
  async processPending(@Query('limit') limit?: string) {
    return this.notificationsService.processPending(
      limit ? Number(limit) : undefined,
    );
  }
}
