import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { SendOtpCommand } from './commands/send-otp.command';
import { VerifyOtpCommand } from './commands/verify-otp.command';
import type { SendOtpRequestDto } from './dto/send-otp.dto';
import type { VerifyOtpRequestDto } from './dto/verify-otp.dto';
import { AuthGuard } from './guards/auth.guard';
import { SESSION_COOKIE_NAME, SESSION_TTL_DAYS } from './auth.constants';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Send OTP to email' })
  @ApiBody({
    description: 'Send OTP payload',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        purpose: { type: 'string', enum: ['login', 'signup'], example: 'login' },
      },
      required: ['email', 'purpose'],
      examples: {
        login: {
          summary: 'Login OTP',
          value: { email: 'user@example.com', purpose: 'login' },
        },
        signup: {
          summary: 'Signup OTP',
          value: { email: 'newuser@example.com', purpose: 'signup' },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'OTP sent' })
  @Post('otp/send')
  async sendOtp(@Body() body: SendOtpRequestDto) {
    return this.commandBus.execute(new SendOtpCommand(body));
  }

  @ApiOperation({ summary: 'Verify OTP and create session' })
  @ApiBody({
    description: 'Verify OTP payload',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        code: { type: 'string', example: '123456' },
        purpose: { type: 'string', enum: ['login', 'signup'], example: 'login' },
      },
      required: ['email', 'code', 'purpose'],
      examples: {
        login: {
          summary: 'Login verify',
          value: { email: 'user@example.com', code: '123456', purpose: 'login' },
        },
        signup: {
          summary: 'Signup verify',
          value: { email: 'newuser@example.com', code: '123456', purpose: 'signup' },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Session token returned and cookie set' })
  @Post('otp/verify')
  async verifyOtp(
    @Body() body: VerifyOtpRequestDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.commandBus.execute(new VerifyOtpCommand(body));

    response.cookie(SESSION_COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    });

    return { token: result.token };
  }

  @ApiOperation({ summary: 'Get current user from session cookie' })
  @ApiResponse({ status: 200, description: 'Current user' })
  @ApiResponse({ status: 403, description: 'Missing or invalid session' })
  @UseGuards(AuthGuard)
  @Get('me')
  async me(@Req() request: Request) {
    // @ts-ignore
    return request?.user as any;
  }
}
