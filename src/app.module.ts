import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/module/user.module';
import { UserSessionsController } from './user-sessions/controller/user-sessions.controller';
import { UserSessionsModule } from './user-sessions/module/user-sessions.module';
import { RedisModule } from './general/redis/redis.module';
import { MailerModule } from './general/mailer/mailer.module';
import { AuthModule } from './auth/module/auth.module';
import { TenantMiddleware } from './middleware/tenant.middleware';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.DATABASE_URL!),
    UserModule,
    UserSessionsModule,
    RedisModule,
    MailerModule,
    UserSessionsModule,
    AuthModule,
  ],
  controllers: [AppController, UserSessionsController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*'); // apply to all routes
  }
}
