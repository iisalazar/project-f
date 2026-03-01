import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { DispatchRouteRequestDto, DispatchStopRequestDto } from './dto/dispatch.dto';
import { DispatchService } from './services/dispatch.service';

@Controller('dispatch')
@UseGuards(AuthGuard)
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post('route')
  async dispatchRoute(@Body() payload: DispatchRouteRequestDto, @Req() request: Request) {
    // @ts-ignore
    const ownerUserId = request.user?.id as string;
    return this.dispatchService.dispatchRoute(ownerUserId, payload);
  }

  @Post('stop')
  async dispatchStop(@Body() payload: DispatchStopRequestDto, @Req() request: Request) {
    // @ts-ignore
    const ownerUserId = request.user?.id as string;
    return this.dispatchService.dispatchStop(ownerUserId, payload);
  }
}
