import { IsNotEmpty, IsMongoId, Length } from 'class-validator';

export class HeaderDto {
  @Length(24, 24)
  @IsMongoId()
  @IsNotEmpty()
  tenantId?: string;
}
