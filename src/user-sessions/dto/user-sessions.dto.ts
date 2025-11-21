import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateUserSessionDto {
  @IsNotEmpty() user_id: string;
  @IsNotEmpty() tenant: string;
  @IsNotEmpty() access_token: string;
  @IsNotEmpty() refresh_token: string;
  @IsOptional() device_type?: string;
  @IsOptional() device_token?: string;
  @IsOptional() fcm_token?: string;
  @IsOptional() more_info?: string;
  @IsOptional() socket_id?: string;
  @IsNotEmpty() expiry_at: Date;
}
