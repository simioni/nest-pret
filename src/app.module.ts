import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { StandardResponseModule } from 'nest-standard-response';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import configurationFactory from './config/configuration.factory';
import { DbConfig } from './config/interfaces/db-config.interface';
import { AuthModule } from './auth/auth.module';
import { validateEnvironmentVariables } from './config/env.validation';
import { APP_PIPE } from '@nestjs/core';

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
    StandardResponseModule.forRoot({
      interceptAll: true,
      validateResponse: (data) => {
        if (data.thisIsAMongooseObject) return false;
        return true;
      },
    }),
    AuthModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    },
    AppService,
  ],
})
export class AppModule {}
