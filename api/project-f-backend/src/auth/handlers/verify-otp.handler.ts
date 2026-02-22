import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { VerifyOtpCommand } from '../commands/verify-otp.command';
import { SESSION_TTL_DAYS } from '../auth.constants';

@CommandHandler(VerifyOtpCommand)
export class VerifyOtpHandler implements ICommandHandler<VerifyOtpCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: VerifyOtpCommand) {
    const { email, code, purpose } = command.payload ?? {};

    if (!email || !code || !purpose) {
      throw new BadRequestException('email, code, and purpose are required');
    }

    if (purpose !== 'login' && purpose !== 'signup') {
      throw new BadRequestException('purpose must be login or signup');
    }

    const otp = await this.prisma.otpVerification.findFirst({
      where: { email, code, purpose },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new BadRequestException('Code is invalid');
    }

    if (otp.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Code expired');
    }

    let user = await this.prisma.user.findUnique({ where: { email } });

    if (purpose === 'signup') {
      if (user) {
        throw new BadRequestException('User already exists');
      }
      user = await this.prisma.user.create({ data: { email } });
    } else if (!user) {
      throw new BadRequestException('User does not exist');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.userSessionToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    await this.prisma.otpVerification.delete({ where: { id: otp.id } });

    return { token, user };
  }
}
