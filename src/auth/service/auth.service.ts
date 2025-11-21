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
      expiry_at: expiryAt,
    };

    // 👉 1. GET ALL ACTIVE SESSIONS FROM DB
    const allSessions = await this.userSessionsService.getActiveSessionsForUser(
      user._id.toString(),
    );

    // 👉 2. SPLIT SESSIONS
    const sameDeviceSessions = allSessions.filter(
      (s) => s.device_type === deviceInfo,
    );
    const otherDeviceSessions = allSessions.filter(
      (s) => s.device_type !== deviceInfo,
    );

    // 👉 3. DELETE PREVIOUS SESSIONS FROM SAME DEVICE
    for (const s of sameDeviceSessions) {
      await this.userSessionsService.deactivateSession(s._id!.toString());
    }

    // 👉 4. SEND ALERT **ONLY TO OTHER DEVICE SESSIONS**
    for (const s of otherDeviceSessions) {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'New login detected',
        template: 'multi-login-alert',
        context: {
          name: user.name,
          time: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
          device: deviceInfo,
        },
      });
    }

    // 👉 5. CREATE NEW SESSION
    const savedSession = await this.userSessionsService.create(sessionDto);

    // Redis update:
    const sessionSetKey = this.redisSessionSetKey(user._id.toString());
    await this.cacheManager.set(sessionSetKey, [
      ...otherDeviceSessions.map((s) => s._id!.toString()),
      savedSession._id.toString(),
    ]);

    await this.cacheManager.set(
      this.redisActiveKey(user._id.toString()),
      savedSession._id.toString(),
    );

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
