import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StandardResponseModule } from './standard-response/standard-response.module';

@Module({
  imports: [StandardResponseModule.forRoot({ interceptAll: true })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
