import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { EmailVerificationOptions } from './interfaces/api-config.interface';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Provision = 'provision',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  @IsOptional()
  PORT: number;

  /**
   * API
   * */
  @IsEnum(EmailVerificationOptions)
  @IsOptional()
  API_EMAIL_VERIFICATION: EmailVerificationOptions;

  @IsString()
  API_INTERNAL_URL: string;

  @IsNumber()
  API_INTERNAL_PORT: number;

  @IsNumber()
  API_THROTTLE_LIMIT: number;

  @IsNumber()
  API_THROTTLE_LIMIT_ACCOUNTS: number;

  @IsNumber()
  API_THROTTLE_TTL: number;

  /**
   * DB
   */
  @IsString()
  DATABASE_USER: string;

  @IsString()
  DATABASE_PASSWORD: string;

  @IsString()
  DATABASE_HOST: string;

  @IsNumber()
  DATABASE_PORT: number;

  @IsString()
  DATABASE_NAME: string;

  @IsString()
  DATABASE_AUTH_SOURCE: string;

  /**
   * JWT
   */
  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRES_IN: string;

  /**
   * MAILER
   */

  @IsString()
  @IsOptional()
  MAILER_HOST: string;

  @IsNumber()
  @IsOptional()
  MAILER_PORT: number;

  @IsString()
  @IsOptional()
  MAILER_USER: string;

  @IsString()
  @IsOptional()
  MAILER_PASSWORD: string;

  @IsString()
  @IsOptional()
  MAILER_FROM_NAME: string;

  @IsString()
  @IsOptional()
  MAILER_FROM_EMAIL: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ obj }) => {
    return [true, 'true'].indexOf(obj.MAILER_SECURE) > -1;
  })
  MAILER_SECURE: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ obj }) => {
    return [true, 'true'].indexOf(obj.MAILER_REQUIRE_TLS) > -1;
  })
  MAILER_REQUIRE_TLS: boolean;

  @IsString()
  @IsOptional()
  MAILER_TLS_CIPHERS: string;

  /**
   * HOST
   */

  @IsString()
  HOST_URL: string;

  @IsNumber()
  HOST_PORT: number;
}
