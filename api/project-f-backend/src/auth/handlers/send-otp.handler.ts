import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service';
import { SendOtpCommand } from '../commands/send-otp.command';
import { EmailServiceAbstraction } from '../services/email.service';
import { OTP_TTL_MINUTES } from '../auth.constants';

@CommandHandler(SendOtpCommand)
export class SendOtpHandler implements ICommandHandler<SendOtpCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailServiceAbstraction,
  ) {}

  async execute(command: SendOtpCommand) {
    const { email, purpose } = command.payload ?? {};

    if (!email || !purpose) {
      throw new BadRequestException('email and purpose are required');
    }

    if (purpose !== 'login' && purpose !== 'signup') {
      throw new BadRequestException('purpose must be login or signup');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (purpose === 'signup' && user) {
      throw new BadRequestException('User already exists');
    }

    if (purpose === 'login' && !user) {
      throw new BadRequestException('User does not exist');
    }

    const code = this.generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

    await this.prisma.otpVerification.deleteMany({
      where: { email, purpose },
    });

    await this.prisma.otpVerification.create({
      data: {
        email,
        purpose,
        code,
        expiresAt,
      },
    });

    await this.emailService.send({
      to: email,
      subject: 'Your OTP code',
      body: `Your OTP code is ${code}`,
    });

    return { success: true };
  }

  private generateOtp(): string {
    const value = Math.floor(Math.random() * 1_000_000);
    return value.toString().padStart(6, '0');
  }
}
