import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  StandardResponseInterceptor,
  StandardResponseInterceptorOptions,
} from './standard-response/interceptors/standard-response.interceptor';
import { StandardResponseModule } from './standard-response/standard-response.module';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useFactory: (reflector: Reflector) => {
        const options: StandardResponseInterceptorOptions = {
          interceptAll: false,
        };
        return new StandardResponseInterceptor(reflector, options);
      },
      inject: [Reflector],
    },
  ],
  imports: [StandardResponseModule],
})
export class AppModule {}
