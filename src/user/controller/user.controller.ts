import {
  Body,
  Controller,
  Post,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { CreateUserDto, UpdatePasswordDto } from '../dto/user.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { HeaderDto } from 'src/general/dto/header.dto';
import { UserService } from '../service/user.service';

@Controller('user')
export class UserController {
  mongoose: any;
  constructor(private readonly userService: UserService) {}

  @Post('create-user')
  async createUser(
    @Body() user: CreateUserDto,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    const headerDto = plainToInstance(HeaderDto, { tenantId });
    const errors = await validate(headerDto);
    if (errors.length > 0) {
      const errorMessages = errors
        .map((err) => Object.values(err.constraints || {}).join(', '))
        .join('; ');

      throw new BadRequestException(errorMessages);
    }
    return this.userService.createUser(user, tenantId);
  }

  @Post('update-password')
  async updatePassword(
    @Body() data: UpdatePasswordDto,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    const headerDto = plainToInstance(HeaderDto, { tenantId });
    const errors = await validate(headerDto);
    if (errors.length > 0) {
      const errorMessages = errors
        .map((err) => Object.values(err.constraints || {}).join(', '))
        .join('; ');

      throw new BadRequestException(errorMessages);
    }
    return this.userService.updatePassword(data.email, data.password);
  }
}
