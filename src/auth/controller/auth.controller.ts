import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Headers,
} from '@nestjs/common';
import { AuthService } from '../service/auth.service';
import { LoginDto } from '../dto/auth.dto';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // login endpoint requires x-tenant-id header
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    if (!tenantId) {
      throw new Error('Missing x-tenant-id header');
    }
    // optional device info from body or headers
    const device = (req.headers['user-agent'] || 'unknown') as string;
    return this.authService.login(dto.email, dto.password, tenantId, device);
  }

  @Post('logout')
  async logout(
    @Body('sessionId') sessionId: string,
    @Body('userId') userId: string,
  ) {
    return this.authService.logout(sessionId, userId);
  }
}
