import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthController } from './auth.controller';
import { SendOtpHandler } from './handlers/send-otp.handler';
import { VerifyOtpHandler } from './handlers/verify-otp.handler';
import { EmailServiceAbstraction } from './services/email.service';
import { MockEmailService } from './services/mock-email.service';
import { AuthGuard } from './guards/auth.guard';

@Module({
  imports: [CqrsModule],
  controllers: [AuthController],
  providers: [
    SendOtpHandler,
    VerifyOtpHandler,
    AuthGuard,
    {
      provide: EmailServiceAbstraction,
      useClass: MockEmailService,
    },
  ],
})
export class AuthModule {}
