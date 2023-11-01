import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from 'src/user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import {
  EmailVerification,
  EmailVerificationSchema,
} from './schemas/email-verification.schema';
import { JwtConfig } from 'src/config/interfaces/jwt-config.interface';
import { ApiConfig } from 'src/config/interfaces/api-config.interface';
import { MailerConfig } from 'src/config/interfaces/mailer-config.interface';
import { MissingMailerConfigError } from './errors/missing-mailer-config.error';
import { JwtStrategy } from './strategies/jwt.strategy';
import {
  ForgottenPassword,
  ForgottenPasswordSchema,
} from './schemas/forgotten-password.schema';

@Module({
  imports: [
    ConfigModule,
    UserModule,
    MongooseModule.forFeature([
      { name: EmailVerification.name, schema: EmailVerificationSchema },
      { name: ForgottenPassword.name, schema: ForgottenPasswordSchema },
    ]),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const jwtConfig = configService.get<JwtConfig>('jwt');
        return {
          secret: jwtConfig.secret,
          signOptions: {
            expiresIn: jwtConfig.expiresIn,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {
  constructor(private readonly configService: ConfigService) {
    const apiConfig = configService.get<ApiConfig>('api');
    const mailerConfig = configService.get<MailerConfig>('mailer');
    if (!mailerConfig.host && apiConfig.emailVerification !== 'off') {
      throw new MissingMailerConfigError(AuthModule.name);
    }
  }
}