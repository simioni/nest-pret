import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HostConfig } from 'src/config/interfaces/host-config.interface';
import { MailerConfig } from 'src/config/interfaces/mailer-config.interface';
import * as nodemailer from 'nodemailer';
import {
  EMAIL_VERIFICATION_ERROR,
  FORGOT_PASSWORD_ERROR,
} from 'src/auth/auth.constants';

@Injectable()
export class MailerService {
  private mailerConfig;
  private hostConfig;
  private transporter;

  constructor(private readonly configService: ConfigService) {
    this.mailerConfig = configService.get<MailerConfig>('mailer');
    this.hostConfig = configService.get<HostConfig>('host');
    this.transporter = nodemailer.createTransport({
      host: this.mailerConfig.host,
      port: this.mailerConfig.port,
      secure: this.mailerConfig.secure,
      requireTLS: this.mailerConfig.requireTLS,
      tls: { ...this.mailerConfig.tls },
      auth: {
        user: this.mailerConfig.user,
        pass: this.mailerConfig.password,
      },
    });
  }

  async sendEmailVerification(email: string, token: string): Promise<boolean> {
    if (!token)
      throw new InternalServerErrorException(
        EMAIL_VERIFICATION_ERROR.EMAIL_NOT_SENT,
      );

    const mailOptions = {
      from: `${this.mailerConfig.fromName} <${this.mailerConfig.fromEmail}>`,
      to: email, // list of receivers (separated by ,)
      subject: 'Verify Email',
      text: 'Verify Email',
      html:
        'Hi! <br><br> Thanks for your registration<br><br>' +
        '<a href=' +
        this.hostConfig.url +
        ':' +
        this.hostConfig.port +
        '/auth/email/verify/' +
        token +
        '>Click here to activate your account</a>', // html body
    };
    const sent = await new Promise<boolean>(async (resolve) => {
      return await this.transporter.sendMail(
        mailOptions,
        async (error, info) => {
          if (error) {
            console.log('Message sent: %s', error);
            throw error;
          }
          console.log('Message sent: %s', info.messageId);
          resolve(true);
        },
      );
    });
    return sent;
  }

  async sendEmailForgotPassword(
    email: string,
    token: string,
  ): Promise<boolean> {
    if (!token)
      throw new InternalServerErrorException(
        FORGOT_PASSWORD_ERROR.EMAIL_NOT_SENT,
      );

    const mailOptions = {
      from: `${this.mailerConfig.fromName} <${this.mailerConfig.fromEmail}>`,
      to: email, // list of receivers (separated by ,)
      subject: 'Frogotten Password',
      text: 'Forgot Password',
      html:
        'Hi! <br><br> If you requested to reset your password<br><br>' +
        '<a href=' +
        this.hostConfig.url +
        ':' +
        this.hostConfig.port +
        '/auth/email/reset-password/' +
        token +
        '>Click here</a>', // html body
    };
    const sent = await new Promise<boolean>(async (resolve, reject) => {
      return await this.transporter.sendMail(
        mailOptions,
        async (error, info) => {
          if (error) {
            console.log('Message sent: %s', error);
            return reject(false);
          }
          console.log('Message sent: %s', info.messageId);
          resolve(true);
        },
      );
    });
    return sent;
  }
}
