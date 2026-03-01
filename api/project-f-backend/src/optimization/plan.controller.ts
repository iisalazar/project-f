import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { CommandBus } from '@nestjs/cqrs';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationAccessGuard } from '../auth/guards/organization-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateV2OptimizationCommand } from './commands/create-v2-optimization.command';
import type { VroomOptimizationRequestDto } from './dto/vroom-optimization.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('plan')
@UseGuards(AuthGuard, OrganizationAccessGuard, RolesGuard)
export class PlanController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('optimize')
  @Roles('org_admin', 'dispatcher')
  async optimize(
    @Body() body: VroomOptimizationRequestDto,
    @Req() request: Request,
  ) {
    // @ts-ignore
    const ownerUserId = request.user?.id as string;
    // @ts-ignore
    const organizationId = request.authContext.activeOrganizationId as string;
    return this.commandBus.execute(
      new CreateV2OptimizationCommand(body, ownerUserId, organizationId),
    );
  }
}
