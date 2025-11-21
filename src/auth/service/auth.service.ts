import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { UserService } from '../../user/service/user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserSessionsService } from '../../user-sessions/service/user-sessions.service';
import { CreateUserSessionDto } from '../../user-sessions/dto/user-sessions.dto';
import { v4 as uuidv4 } from 'uuid';
import { MailerService } from '@nestjs-modules/mailer';
import { format } from 'date-fns';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
    private readonly userSessionsService: UserSessionsService,

    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache, // <---- NEW CHANGE

    private readonly mailerService: MailerService,
  ) {}

  private redisActiveKey(userId: string) {
    return `active_session:${userId}`;
  }

  private redisSessionSetKey(userId: string) {
    return `user_sessions:${userId}`;
  }

  async validateUser(email: string, password: string, tenantId: string) {
    const user = await this.usersService.findByEmailAndTenant(email, tenantId);
    if (!user) return null;

    const match = await bcrypt.compare(password, user.password);
    if (!match) return null;

    return user;
  }

  async login(
    email: string,
    password: string,
    tenantId: string,
    deviceInfo = 'unknown',
    ipAddress = 'unknown',
  ) {
    const user = await this.validateUser(email, password, tenantId);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const payload = {
      sub: user._id.toString(),
      type: user.type,
      tenantId: user.tenantId!.toString(),
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = uuidv4();
    const expiryAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    const sessionDto: CreateUserSessionDto = {
      user_id: user._id.toString(),
      tenant: user.tenantId!.toString(),
      access_token: accessToken,
      refresh_token: refreshToken,
      device_type: deviceInfo,
      ip_address: ipAddress,
      expiry_at: expiryAt,
    };

    const allSessions = await this.userSessionsService.getActiveSessionsForUser(
      user._id.toString(),
    );

    // 👉 SAME DEVICE + SAME IP = old session that needs to be deleted
    const sameDeviceAndIpSessions = allSessions.filter(
      (s) => s.device_type === deviceInfo && s.ip_address === ipAddress,
    );

    // 👉 DIFFERENT device OR IP = alert required
    const differentSessions = allSessions.filter(
      (s) => s.device_type !== deviceInfo || s.ip_address !== ipAddress,
    );

    // Delete previous sessions from same device+IP
    for (const s of sameDeviceAndIpSessions) {
      await this.userSessionsService.deactivateSession(s._id!.toString());
    }

    // Send email alert only to sessions with different IP/device
    for (const s of differentSessions) {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'New login detected',
        template: 'multi-login-alert',
        context: {
          name: user.name,
          time: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
          device: deviceInfo,
          ip: ipAddress,
        },
      });
    }

    const savedSession = await this.userSessionsService.create(sessionDto);

    return {
      accessToken,
      refreshToken,
      expiresIn: expiryAt,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        type: user.type,
        tenantId: user.tenantId!.toString(),
      },
    };
  }

  async logout(sessionId: string, userId: string) {
    const sessionSetKey = this.redisSessionSetKey(userId);

    let existing: string[] = (await this.cacheManager.get(sessionSetKey)) || [];

    // Remove one session
    existing = existing.filter((id) => id !== sessionId);

    await this.cacheManager.set(sessionSetKey, existing);

    // Also update DB
    await this.userSessionsService.terminateAllSessionsForUser(userId);
  }

  async forceLogoutAll(userId: string) {
    await this.userSessionsService.terminateAllSessionsForUser(userId);

    const sessionSetKey = this.redisSessionSetKey(userId);
    await this.cacheManager.del(sessionSetKey);
  }
}
