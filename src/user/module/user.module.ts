import { Module } from '@nestjs/common';
import { UserController } from '../controller/user.controller';
import { UserService } from '../service/user.service';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schema/user.schema';
import { Hospital, HospitalSchema } from 'src/general/schemas/hospital.schema';
import { UserSessionsModule } from 'src/user-sessions/module/user-sessions.module';

@Module({
  controllers: [UserController],
  providers: [UserService],
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Hospital.name, schema: HospitalSchema },
    ]),
    UserSessionsModule,
  ],
  exports: [UserService],
})
export class UserModule {}
