import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StandardResponseModule } from './standard-response/standard-response.module';

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [StandardResponseModule],
})
export class AppModule {}
