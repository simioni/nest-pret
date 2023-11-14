import {
  ApiConfig,
  EmailVerificationOptions,
} from './interfaces/api-config.interface';
import { DbConfig } from './interfaces/db-config.interface';
import { HostConfig } from './interfaces/host-config.interface';
import { JwtConfig } from './interfaces/jwt-config.interface';
import { MailerConfig } from './interfaces/mailer-config.interface';

export default (): {
  db: DbConfig;
  mailer: MailerConfig;
  jwt: JwtConfig;
  api: ApiConfig;
  host: HostConfig;
} => ({
  db: {
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT),
    databaseName: process.env.DATABASE_NAME,
    authSource: process.env.DATABASE_AUTH_SOURCE,
    getDatabaseUri() {
      const userString =
        this.user && this.password ? `${this.user}:${this.password}@` : '';
      const authSource = this.authSource
        ? `?authSource=${this.authSource}&w=1`
        : '';
      const mongoUri = `mongodb://${userString}${this.host}:${this.port}/${this.databaseName}${authSource}`;
      return mongoUri;
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
  },
  mailer: {
    host: process.env.MAILER_HOST,
    port: parseInt(process.env.MAILER_PORT),
    user: process.env.MAILER_USER,
    password: process.env.MAILER_PASSWORD,
    fromName: process.env.MAILER_FROM_NAME,
    fromEmail: process.env.MAILER_FROM_EMAIL,
    secure: process.env.MAILER_SECURE === 'true',
    requireTLS: process.env.MAILER_REQUIRE_TLS === 'true',
    ...(!process.env.MAILER_REQUIRE_TLS
      ? {}
      : {
          tls: {
            ciphers: process.env.MAILER_TLS_CIPHERS || 'SSLv3',
          },
        }),
  },
  api: {
    emailVerification:
      EmailVerificationOptions[process.env.API_EMAIL_VERIFICATION] || 'off',
    emailVerificationIsOn() {
      return this.emailVerification !== EmailVerificationOptions.off;
    },
    emailVerificationIsRequired() {
      return this.emailVerification === EmailVerificationOptions.required;
    },
    // Docker internal URL and port for the api server
    internalUrl: process.env.API_INTERNAL_URL,
    internalPort: parseInt(process.env.API_INTERNAL_PORT),
  },
  host: {
    // System external (public) URL. This is used to create links back to the app in the emails sent (eg: for email confirmation)
    url: process.env.HOST_URL,
    port: parseInt(process.env.HOST_PORT),
  },
});
