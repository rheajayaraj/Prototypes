import { UserType } from '../../common/enums';

export class CreateUserDto {
  name: string;
  email: string;
  phone: string;
  password: string;
  dob?: Date;
  age?: number;
  type: UserType;
  tenantId: string;
}

export class UpdatePasswordDto {
  email: string;
  password: string;
}
