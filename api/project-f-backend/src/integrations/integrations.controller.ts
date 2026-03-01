import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationAccessGuard } from '../auth/guards/organization-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type {
  ImportStopsCsvDto,
  IngestExternalOrderDto,
  UpsertWebhookSubscriptionDto,
} from './dto/webhook-subscription.dto';
import { IntegrationsService } from './integrations.service';

@Controller('integrations')
@UseGuards(AuthGuard, OrganizationAccessGuard, RolesGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('webhooks')
  @Roles('org_admin', 'dispatcher', 'viewer')
  async listWebhooks(@Req() request: Request) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.integrationsService.listWebhooks(organizationId);
  }

  @Post('webhooks')
  @Roles('org_admin', 'dispatcher')
  async createWebhook(
    @Req() request: Request,
    @Body() body: UpsertWebhookSubscriptionDto,
  ) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.integrationsService.upsertWebhook(organizationId, body);
  }

  @Delete('webhooks/:id')
  @Roles('org_admin', 'dispatcher')
  async removeWebhook(@Req() request: Request, @Param('id') id: string) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.integrationsService.removeWebhook(organizationId, id);
  }

  @Post('webhooks/:id/test-delivery')
  @Roles('org_admin', 'dispatcher')
  async testWebhookDelivery(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.integrationsService.buildSignedDelivery(organizationId, id, body);
  }

  @Get('stops/export.csv')
  @Roles('org_admin', 'dispatcher', 'viewer')
  async exportStopsCsv(@Req() request: Request) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    const csv = await this.integrationsService.exportStopsCsv(organizationId);
    return { csv };
  }

  @Post('stops/import.csv')
  @Roles('org_admin', 'dispatcher')
  async importStopsCsv(
    @Req() request: Request,
    @Body() body: ImportStopsCsvDto,
  ) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.integrationsService.importStopsCsv(organizationId, body);
  }

  @Post('orders/external')
  @Roles('org_admin', 'dispatcher')
  async ingestExternalOrder(
    @Req() request: Request,
    @Body() body: IngestExternalOrderDto,
  ) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.integrationsService.ingestExternalOrder(organizationId, body);
  }
}
