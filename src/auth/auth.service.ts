import {
  ForbiddenException,
  GoneException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import * as nodemailer from 'nodemailer';
import { HostConfig } from 'src/config/interfaces/host-config.interface';
import { MailerConfig } from 'src/config/interfaces/mailer-config.interface';
import { User, UserDocument } from 'src/user/schemas/user.schema';
import { UserService } from 'src/user/user.service';
import {
  ApiConfig,
  EmailVerificationOptions,
} from 'src/config/interfaces/api-config.interface';
import {
  EmailVerification,
  EmailVerificationDocument,
} from './schemas/email-verification.schema';
import {
  ForgottenPassword,
  ForgottenPasswordDocument,
} from './schemas/forgotten-password.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(EmailVerification.name)
    private readonly emailVerificationModel: Model<EmailVerificationDocument>,
    @InjectModel(ForgottenPassword.name)
    private readonly forgottenPasswordModel: Model<ForgottenPasswordDocument>,
    private configService: ConfigService,
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async login(email, password) {
    const user: Partial<UserDocument> = await this.userService.findOne(email, {
      returnRawMongooseObject: true,
    });
    if (!user) throw new NotFoundException('LOGIN.USER_NOT_FOUND');

    const isValidPass = await bcrypt.compare(password, user.password);
    if (!isValidPass) throw new UnauthorizedException('LOGIN.ERROR');

    const apiConfig = this.configService.get<ApiConfig>('api');

    if (
      apiConfig.emailVerification === EmailVerificationOptions.required &&
      !user.isVerified()
    )
      throw new ForbiddenException('LOGIN.EMAIL_NOT_VERIFIED');

    const payload = { _id: user._id.toString(), name: user.name };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: new User(user.toJSON()),
    };
  }

  private async createEmailToken(email: string): Promise<boolean> {
    const existingToken = await this.emailVerificationModel.findOne({
      email: email,
    });
    if (
      existingToken &&
      (new Date().getTime() - existingToken.timestamp.getTime()) / 60000 < 15
    )
      throw new HttpException('LOGIN.EMAIL_SENT_RECENTLY', 429);

    const user = await this.userService.findOne(email);
    if (!user) throw new NotFoundException('LOGIN.USER_NOT_FOUND');
    if (user.isVerified())
      throw new ForbiddenException('LOGIN.EMAIL_ALREADY_VERIFIED');

    await this.emailVerificationModel.findOneAndUpdate(
      { email: email },
      {
        email: email,
        emailToken: (Math.floor(Math.random() * 9000000) + 1000000).toString(), //Generate 7 digits number
        timestamp: new Date(),
      },
      { upsert: true },
    );
    return true;
  }

  private async createForgottenPasswordToken(
    email: string,
  ): Promise<ForgottenPassword> {
    const existingToken = await this.forgottenPasswordModel.findOne({
      email: email,
    });
    if (
      existingToken &&
      (new Date().getTime() - existingToken.timestamp.getTime()) / 60000 < 15
    )
      throw new HttpException('RESET_PASSWORD.EMAIL_SENT_RECENTLY', 429);

    const token = await this.forgottenPasswordModel.findOneAndUpdate(
      { email: email },
      {
        email: email,
        newPasswordToken: (
          Math.floor(Math.random() * 9000000) + 1000000
        ).toString(), //Generate 7 digits number,
        timestamp: new Date(),
      },
      { upsert: true, new: true },
    );
    if (!token) {
      throw new InternalServerErrorException('LOGIN.ERROR.GENERIC_ERROR');
    }
    return token;
  }

  async verifyEmail(token: string): Promise<boolean> {
    const verification = await this.emailVerificationModel.findOne({
      emailToken: token,
    });
    if (!verification || !verification.email)
      throw new ForbiddenException('LOGIN.EMAIL_VERIFICATION_TOKEN_NOT_VALID');

    const verified = await this.userService.verifyEmail(verification.email);
    if (!verified)
      throw new ForbiddenException('LOGIN.EMAIL_VERIFICATION_EMAIL_NOT_VALID');

    await verification.deleteOne();
    return true;
  }

  async sendEmailVerification(email: string): Promise<boolean> {
    await this.createEmailToken(email);

    const verification = await this.emailVerificationModel.findOne({
      email: email,
    });
    if (!verification || !verification.emailToken)
      throw new ForbiddenException('REGISTER.USER_NOT_REGISTERED');

    const mailerConfig = this.configService.get<MailerConfig>('mailer');
    const hostConfig = this.configService.get<HostConfig>('host');

    const transporter = nodemailer.createTransport({
      host: mailerConfig.host,
      port: mailerConfig.port,
      secure: mailerConfig.secure, // true for 465, false for other ports
      requireTLS: mailerConfig.requireTLS,
      tls: { ...mailerConfig.tls },
      auth: {
        user: mailerConfig.user,
        pass: mailerConfig.password,
      },
    });

    console.log(
      `sending email from: ${mailerConfig.fromName} <${mailerConfig.fromEmail}>`,
    );
    const mailOptions = {
      from: `${mailerConfig.fromName} <${mailerConfig.fromEmail}>`,
      to: email, // list of receivers (separated by ,)
      subject: 'Verify Email',
      text: 'Verify Email',
      html:
        'Hi! <br><br> Thanks for your registration<br><br>' +
        '<a href=' +
        hostConfig.url +
        ':' +
        hostConfig.port +
        '/auth/email/verify/' +
        verification.emailToken +
        '>Click here to activate your account</a>', // html body
    };

    const sent = await new Promise<boolean>(async function (resolve, reject) {
      return await transporter.sendMail(mailOptions, async (error, info) => {
        if (error) {
          console.log('Message sent: %s', error);
          throw error;
        }
        console.log('Message sent: %s', info.messageId);
        resolve(true);
      });
    });

    return sent;
  }

  async sendEmailForgotPassword(email: string): Promise<boolean> {
    const user = await this.userService.findOne(email);
    if (!user) throw new NotFoundException('LOGIN.USER_NOT_FOUND');

    const mailerConfig = this.configService.get<MailerConfig>('mailer');
    const hostConfig = this.configService.get<HostConfig>('host');

    const tokenModel = await this.createForgottenPasswordToken(email);

    if (tokenModel && tokenModel.newPasswordToken) {
      const transporter = nodemailer.createTransport({
        host: mailerConfig.host,
        port: mailerConfig.port,
        secure: mailerConfig.secure, // true for 465, false for other ports
        auth: {
          user: mailerConfig.user,
          pass: mailerConfig.password,
        },
      });

      const mailOptions = {
        from: `${mailerConfig.fromName} <${mailerConfig.fromEmail}>`,
        to: user.email, // list of receivers (separated by ,)
        subject: 'Frogotten Password',
        text: 'Forgot Password',
        html:
          'Hi! <br><br> If you requested to reset your password<br><br>' +
          '<a href=' +
          hostConfig.url +
          ':' +
          hostConfig.port +
          '/auth/email/reset-password/' +
          tokenModel.newPasswordToken +
          '>Click here</a>', // html body
      };

      const sent = await new Promise<boolean>(async function (resolve, reject) {
        return await transporter.sendMail(mailOptions, async (error, info) => {
          if (error) {
            console.log('Message sent: %s', error);
            return reject(false);
          }
          console.log('Message sent: %s', info.messageId);
          resolve(true);
        });
      });

      return sent;
    } else {
      throw new ForbiddenException('REGISTER.USER_NOT_REGISTERED');
    }
  }

  async resetPasswordFromCurrentPassword(
    email: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    const user = await this.userService.findOne(email, {
      returnRawMongooseObject: true,
    });
    if (!user) throw new NotFoundException('RESET_PASSWORD.USER_NOT_FOUND');

    const isValidPass = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPass)
      throw new UnauthorizedException('RESET_PASSWORD.UNAUTHORIZED');

    await this.userService.setPassword(email, newPassword);
    return true;
  }

  async resetPasswordFromToken(
    token: string,
    newPassword: string,
  ): Promise<boolean> {
    const forgottenPassword = await this.forgottenPasswordModel.findOne({
      newPasswordToken: token,
    });
    if (!forgottenPassword)
      throw new NotFoundException('RESET_PASSWORD.REQUEST_NOT_FOUND');

    // oportunistic email confirmation in case it's not confirmed already
    await this.userService.verifyEmail(forgottenPassword.email);

    if (
      (new Date().getTime() - forgottenPassword.timestamp.getTime()) / 60000 >
      20
    )
      throw new GoneException('RESET_PASSWORD.LINK_EXPIRED');

    await this.userService.setPassword(forgottenPassword.email, newPassword);
    await forgottenPassword.deleteOne();
    return true;
  }
}
