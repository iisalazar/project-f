import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { CommandBus } from '@nestjs/cqrs';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CreateV2OptimizationCommand } from './commands/create-v2-optimization.command';
import type { VroomOptimizationRequestDto } from './dto/vroom-optimization.dto';

@Controller('plan')
@UseGuards(AuthGuard)
export class PlanController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('optimize')
  async optimize(@Body() body: VroomOptimizationRequestDto, @Req() request: Request) {
    // @ts-ignore
    const ownerUserId = request.user?.id as string;
    return this.commandBus.execute(new CreateV2OptimizationCommand(body, ownerUserId));
  }
}
