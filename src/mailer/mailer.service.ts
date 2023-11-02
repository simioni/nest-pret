import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HostConfig } from 'src/config/interfaces/host-config.interface';
import { MailerConfig } from 'src/config/interfaces/mailer-config.interface';
import nodemailer from 'nodemailer';

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
    if (!token) throw new ForbiddenException('REGISTER.USER_NOT_REGISTERED');

    console.log(
      `sending email from: ${this.mailerConfig.fromName} <${this.mailerConfig.fromEmail}>`,
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

    const sent = await new Promise<boolean>(async function (resolve) {
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
}
