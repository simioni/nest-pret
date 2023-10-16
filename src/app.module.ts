import { Module } from '@nestjs/common';
import { StandardResponseModule } from 'nest-standard-response';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    StandardResponseModule.forRoot({
      interceptAll: true,
      validateResponse: (data) => {
        if (data.thisIsAMongooseObject) return false;
        return true;
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
