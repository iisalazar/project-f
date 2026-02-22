import { SendOtpRequestDto } from '../dto/send-otp.dto';

export class SendOtpCommand {
  constructor(public readonly payload: SendOtpRequestDto) {}
}
