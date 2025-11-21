import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { MailerModule } from 'src/general/mailer/mailer.module';
import { RedisModule } from 'src/general/redis/redis.module';
import { Hospital, HospitalSchema } from 'src/general/schemas/hospital.schema';
import { UserSessionsModule } from 'src/user-sessions/module/user-sessions.module';
import { UserModule } from 'src/user/module/user.module';
import { User, UserSchema } from 'src/user/schema/user.schema';
import { AuthService } from '../service/auth.service';
import { JwtStrategy } from 'src/general/jwt/jwt.strategy';
import { AuthController } from '../controller/auth.controller';

@Module({
  imports: [
    UserModule,
    UserSessionsModule,
    MailerModule,
    RedisModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Hospital.name, schema: HospitalSchema },
    ]),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
