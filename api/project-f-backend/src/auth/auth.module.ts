import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthController } from './auth.controller';
import { SendOtpHandler } from './handlers/send-otp.handler';
import { VerifyOtpHandler } from './handlers/verify-otp.handler';
import { EmailServiceAbstraction } from './services/email.service';
import { MockEmailService } from './services/mock-email.service';
import { AuthGuard } from './guards/auth.guard';
import { OrganizationMembershipService } from './services/organization-membership.service';
import { OrganizationAccessGuard } from './guards/organization-access.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [CqrsModule],
  controllers: [AuthController],
  providers: [
    SendOtpHandler,
    VerifyOtpHandler,
    AuthGuard,
    OrganizationAccessGuard,
    RolesGuard,
    OrganizationMembershipService,
    {
      provide: EmailServiceAbstraction,
      useClass: MockEmailService,
    },
  ],
  exports: [
    AuthGuard,
    OrganizationAccessGuard,
    RolesGuard,
    OrganizationMembershipService,
  ],
})
export class AuthModule {}
