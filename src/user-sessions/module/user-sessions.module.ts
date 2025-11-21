import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSession, UserSessionSchema } from '../schema/user-session.schema';
import { UserSessionsService } from '../service/user-sessions.service';
import { RedisModule } from 'src/general/redis/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserSession.name, schema: UserSessionSchema },
    ]),
    RedisModule,
  ],
  providers: [UserSessionsService],
  exports: [UserSessionsService],
})
export class UserSessionsModule {}
