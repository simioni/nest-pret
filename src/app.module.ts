import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { StandardResponseModule } from 'nest-standard-response';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import configurationFactory from './config/configuration.factory';
import { DbConfig } from './config/interfaces/db-config.interface';

function getMongoUri(dbConfig: DbConfig) {
  const userString =
    dbConfig.user && dbConfig.password
      ? dbConfig.user + ':' + dbConfig.password + '@'
      : '';
  const authSource = dbConfig.authSource
    ? '?authSource=' + dbConfig.authSource + '&w=1'
    : '';

  const mongoUri =
    'mongodb://' +
    userString +
    dbConfig.host +
    ':' +
    (dbConfig.port || '27017') +
    '/' +
    dbConfig.databaseName +
    authSource;

  return mongoUri;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      load: [configurationFactory],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: getMongoUri(configService.get('db')),
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
    // AuthModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
