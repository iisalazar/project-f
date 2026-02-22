export type OtpPurpose = 'login' | 'signup';

export interface SendOtpRequestDto {
  email: string;
  purpose: OtpPurpose;
}
