import { Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationAccessGuard } from '../auth/guards/organization-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(AuthGuard, OrganizationAccessGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('kpi/aggregate')
  @Roles('org_admin', 'dispatcher')
  async aggregate(
    @Req() request: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.analyticsService.aggregateKpis(organizationId, from, to);
  }

  @Get('reports/summary')
  @Roles('org_admin', 'dispatcher', 'viewer')
  async summary(
    @Req() request: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.analyticsService.summaryReport(organizationId, from, to);
  }

  @Get('reports/driver-scorecards')
  @Roles('org_admin', 'dispatcher', 'viewer')
  async driverScorecards(
    @Req() request: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    const rows = await this.analyticsService.driverScorecards(
      organizationId,
      from,
      to,
    );

    return rows.map((row) => {
      const totalStops = Number(row.totalStops ?? 0n);
      const onTimeStops = Number(row.onTimeStops ?? 0n);
      return {
        driverId: row.driverId,
        driverName: row.driverName,
        totalStops,
        completedStops: Number(row.completedStops ?? 0n),
        failedStops: Number(row.failedStops ?? 0n),
        onTimeRate: totalStops > 0 ? onTimeStops / totalStops : 0,
      };
    });
  }
}
