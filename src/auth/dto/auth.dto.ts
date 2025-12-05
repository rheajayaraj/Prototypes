import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty() @IsEmail() email: string;
  @IsNotEmpty() @IsString() password: string;
}

export class TwoFAGenerateResponseDto {
  otpauth_url: string;
  qrCodeDataURL: string;
}

export class Verify2FADto {
  code: string;
  twoFactorToken?: string;
}
