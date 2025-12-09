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
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/user/schema/user.schema';
import { Model } from 'mongoose';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
    private readonly userSessionsService: UserSessionsService,

    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache, // <---- NEW CHANGE

    private readonly mailerService: MailerService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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

    if (user.two_factor_enabled) {
      // return an indicator and a short-lived token
      const twoFactorToken = this.generateTwoFactorToken(user._id.toString());
      return { two_factor_required: true, two_factor_token: twoFactorToken };
    }

    const payload = {
      id: user._id.toString(),
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

  async generateTwoFactorSecret(userId: string) {
    // generate secret; label with app and user email for scanner
    const user = await this.usersService.findById(userId);
    const secret = speakeasy.generateSecret({
      name: `Telemedicine (${user!.email})`,
      length: 20,
    });

    await this.userModel.findByIdAndUpdate(userId, {
      two_factor_temp_secret: secret.base32,
    });

    // generate QR data url from otpauth_url
    const otpauth_url = secret.otpauth_url!;
    const qrCodeDataURL = await qrcode.toDataURL(otpauth_url);

    await this.usersService.setTwoFactorTempSecret(userId, secret.base32);

    return { otpauth_url, qrCodeDataURL, base32: secret.base32 };
  }

  async verifyAndEnableTwoFactor(userId: string, code: string) {
    // read temp secret
    const tempSecret = await this.usersService.getTwoFactorTempSecret(userId);
    if (!tempSecret) throw new Error('No 2FA setup in progress');

    const verified = speakeasy.totp.verify({
      secret: tempSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!verified) {
      throw new Error('Invalid 2FA code');
    }

    // enable 2FA and store secret permanently on user
    await this.usersService.enableTwoFactorForUser(userId, tempSecret);

    // cleanup temp secret maybe
    return { success: true };
  }

  // Called when login returns two_factor_required
  async verifyTwoFactorToken(twoFactorToken: string, code: string) {
    try {
      const payload = this.jwtService.verify(twoFactorToken, {
        secret: process.env.JWT_SECRET,
      }) as any;
      if (!payload || !payload.tfa || !payload.sub)
        throw new Error('Invalid token');

      const userId = payload.sub;
      const user = await this.usersService.findById(userId);
      if (!user || !user.two_factor_enabled || !user.two_factor_secret) {
        throw new Error('2FA not configured for user');
      }

      // verify code
      const valid = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: code,
        window: 1,
      });

      if (!valid) throw new Error('Invalid 2FA code');

      // issue final access token (full JWT) – include tenant and user_type as you need
      const payloadJwt = {
        sub: user._id.toString(),
        type: user.type,
        tenantId: user.tenantId?.toString(),
      };

      const accessToken = this.jwtService.sign(payloadJwt);
      const refreshToken = /* generate refresh token */ uuidv4();
      // Save session/refresh token etc as you already do

      return { accessToken, refreshToken };
    } catch (e) {
      throw e;
    }
  }

  // helper for login: when 2FA is enabled return a temporary token
  generateTwoFactorToken(userId: string) {
    return this.jwtService.sign(
      { sub: userId, tfa: true },
      { expiresIn: '5m' },
    );
  }

  async disableTwoFactor(userId: string) {
    await this.usersService.disableTwoFactor(userId);
    return { success: true };
  }
}
