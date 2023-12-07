import {
  BadRequestException,
  ExecutionContext,
  Module,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { StandardResponseModule } from 'nest-standard-response';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import configurationFactory from './config/configuration.factory';
import { DbConfig } from './config/interfaces/db-config.interface';
import { AuthModule } from './auth/auth.module';
import { validateEnvironmentVariables } from './config/env.validation';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { MailerModule } from './mailer/mailer.module';
import { VALIDATION_ERROR } from './app.constants';
import { RolesSerializerInterceptor } from './user/interceptors/roles-serializer.interceptor';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ApiConfig } from './config/interfaces/api-config.interface';
import { AuthController } from './auth/auth.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      validate: validateEnvironmentVariables,
      load: [configurationFactory],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<DbConfig>('db').getDatabaseUri(),
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          name: 'globalThrottler',
          ttl: configService.get<ApiConfig>('api').throttleTtl,
          limit: configService.get<ApiConfig>('api').throttleLimit,
        },
        {
          name: 'accountRegisterThrottler',
          ttl: configService.get<ApiConfig>('api').throttleTtl,
          limit: configService.get<ApiConfig>('api').throttleLimitAccounts,
          skipIf: (ctx: ExecutionContext) =>
            ctx.getClass().name !== AuthController.name ||
            ctx.getHandler().name !== 'register',
        },
      ],
    }),
    StandardResponseModule.forRoot({
      interceptAll: true,
      // TODO StandardError options... like 429 Too Many Requests (from the global rate limiter)
      validateResponse: (data) => {
        if (data.thisIsAMongooseObject) return false;
        return true;
      },
    }),
    AuthModule,
    UserModule,
    MailerModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: (errors: ValidationError[]) =>
          new BadRequestException({
            statusCode: 400,
            error: 'Bad Request',
            message: VALIDATION_ERROR.ERROR,
            errors: errors.map((error) => ({
              field: error.property,
              errors: error.constraints,
            })),
          }),
      }),
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RolesSerializerInterceptor,
    },
    AppService,
  ],
})
export class AppModule {}
