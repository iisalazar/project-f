import type { OtpPurpose } from './send-otp.dto';

export interface VerifyOtpRequestDto {
  email: string;
  code: string;
  purpose: OtpPurpose;
}
