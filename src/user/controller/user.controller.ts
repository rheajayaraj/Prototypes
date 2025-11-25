import {
  Body,
  Controller,
  Post,
  Headers,
  BadRequestException,
  UseGuards,
  Get,
  Req,
} from '@nestjs/common';
import { CreateUserDto, UpdatePasswordDto } from '../dto/user.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { HeaderDto } from 'src/general/dto/header.dto';
import { UserService } from '../service/user.service';
import { AuthGuard } from 'src/middleware/auth.guard';

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

  @UseGuards(AuthGuard)
  @Get()
  async getUsers(@Req() req: Request) {
    const jwtUser = req['user']; // added by AuthGuard decode

    return this.userService.getUsersWithPermissions(jwtUser);
  }
}
