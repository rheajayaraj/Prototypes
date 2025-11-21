import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Cache } from 'cache-manager';
import { Model, Types } from 'mongoose';
import {
  UserSession,
  UserSessionDocument,
} from '../schema/user-session.schema';
import { CreateUserSessionDto } from '../dto/user-sessions.dto';
import { Status } from '../../common/enums';

@Injectable()
export class UserSessionsService {
  constructor(
    @InjectModel(UserSession.name)
    private sessionModel: Model<UserSessionDocument>,

    @Inject('CACHE_MANAGER')
    private readonly cacheManager: Cache,
  ) {}

  private userActiveSetKey(userId: string) {
    return `user_sessions:${userId}`;
  }

  private tokenBlacklistKey() {
    return 'token_blacklist';
  }

  // helper to simulate Redis set add
  private async addToSet(key: string, value: string) {
    const set = ((await this.cacheManager.get<string[]>(key)) ||
      []) as string[];
    if (!set.includes(value)) {
      set.push(value);
      await this.cacheManager.set(key, set);
    }
  }

  private async getSet(key: string) {
    return ((await this.cacheManager.get<string[]>(key)) || []) as string[];
  }

  private async removeKey(key: string) {
    await this.cacheManager.del(key);
  }

  async create(dto: CreateUserSessionDto) {
    const created = new this.sessionModel(dto);
    const saved = await created.save();

    const sessionId = saved._id.toString();

    // add session to set
    await this.addToSet(this.userActiveSetKey(dto.user_id), sessionId);

    // store token with TTL
    await this.cacheManager.set(
      `session_token:${sessionId}`,
      dto.access_token,
      24 * 60 * 60, // TTL seconds
    );

    return saved;
  }

  async getActiveSessionIdsForUser(userId: string) {
    return this.getSet(this.userActiveSetKey(userId));
  }

  async notifyPreviousSessionsAndKeep(
    userId: string,
    newSessionId: string,
    mailCallback: (sessionId: string) => Promise<void>,
  ) {
    const sessions = await this.getActiveSessionIdsForUser(userId);
    for (const s of sessions) {
      if (s !== newSessionId) {
        await mailCallback(s);
      }
    }
  }

  async terminateAllSessionsForUser(userId: string) {
    await this.sessionModel.updateMany(
      { user_id: userId, status: Status.ACTIVE },
      { status: Status.INACTIVE },
    );

    await this.removeKey(this.userActiveSetKey(userId));
  }

  async invalidateToken(accessToken: string) {
    const key = this.tokenBlacklistKey();
    const list = ((await this.cacheManager.get<string[]>(key)) ||
      []) as string[];
    list.push(accessToken);
    await this.cacheManager.set(key, list, 24 * 60 * 60);
  }

  async isTokenBlacklisted(token: string) {
    const list = ((await this.cacheManager.get<string[]>(
      this.tokenBlacklistKey(),
    )) || []) as string[];
    return list.includes(token);
  }

  async findMany(ids: string[]): Promise<UserSession[]> {
    if (!ids || ids.length === 0) return [];

    return this.sessionModel.find({
      _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
    });
  }

  async delete(id: string): Promise<void> {
    await this.sessionModel.deleteOne({ _id: id });
  }

  async deactivateSession(id: string) {
    await this.sessionModel.updateOne({ _id: id }, { status: Status.INACTIVE });

    // remove from Redis set
    const session = await this.sessionModel.findById(id);
    if (session) {
      const key = this.userActiveSetKey(session.user_id.toString());
      const set = await this.getSet(key);
      const updated = set.filter((s) => s !== id);
      await this.cacheManager.set(key, updated);
    }
  }

  async getActiveSessionsForUser(userId: string): Promise<UserSession[]> {
    return this.sessionModel.find({
      user_id: userId,
      status: Status.ACTIVE,
    });
  }
}
