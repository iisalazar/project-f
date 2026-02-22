import { VerifyOtpRequestDto } from '../dto/verify-otp.dto';

export class VerifyOtpCommand {
  constructor(public readonly payload: VerifyOtpRequestDto) {}
}
