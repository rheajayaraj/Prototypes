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
import * as UAParser from 'ua-parser-js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    if (!tenantId) {
      throw new Error('Missing x-tenant-id header');
    }

    const forwarded = req.headers['x-forwarded-for'];
    let ip = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded?.split(',')[0].trim();

    ip = ip || req.socket.remoteAddress;

    // const parser = new UAParser.UAParser(req.headers['user-agent']);
    // console.log(req.headers['user-agent'], 'and', ip);
    // const ua = parser.getResult();

    // const deviceInfo =
    //   `${ua.device.vendor || ''} ${ua.device.model || ''} ${ua.os.name || ''} ${ua.browser.name || ''}`.trim() ||
    //   'unknown';

    const deviceInfo = (req.headers['user-agent'] as string) || 'unknown';

    return this.authService.login(
      dto.email,
      dto.password,
      tenantId,
      deviceInfo,
      ip,
    );
  }

  @Post('logout')
  async logout(
    @Body('sessionId') sessionId: string,
    @Body('userId') userId: string,
  ) {
    return this.authService.logout(sessionId, userId);
  }
}
