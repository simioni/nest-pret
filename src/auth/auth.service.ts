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
import {
  ApiConfig,
  EmailVerificationOptions,
} from '../config/interfaces/api-config.interface';
import { MailerService } from '../mailer/mailer.service';
import { User, UserDocument } from '../user/schemas/user.schema';
import { UserService } from '../user/user.service';
import * as crypto from 'node:crypto';

import {
  EMAIL_VERIFICATION_ERROR,
  FORGOT_PASSWORD_ERROR,
  LOGIN_ERROR,
  REGISTRATION_SUCCESS,
  RESET_PASSWORD_ERROR,
} from './auth.constants';
import {
  EmailVerification,
  EmailVerificationDocument,
} from './schemas/email-verification.schema';
import {
  ForgottenPassword,
  ForgottenPasswordDocument,
} from './schemas/forgotten-password.schema';
import { JwtToken, LoginResponse } from './responses/login.response';

@Injectable()
export class AuthService {
  private apiConfig: ApiConfig;

  constructor(
    @InjectModel(EmailVerification.name)
    private readonly emailVerificationModel: Model<EmailVerificationDocument>,
    @InjectModel(ForgottenPassword.name)
    private readonly forgottenPasswordModel: Model<ForgottenPasswordDocument>,
    private configService: ConfigService,
    private mailerService: MailerService,
    private userService: UserService,
    private jwtService: JwtService,
  ) {
    this.apiConfig = this.configService.get<ApiConfig>('api');
  }

  async login(email, password): Promise<LoginResponse> {
    const user: Partial<UserDocument> = await this.userService
      .findOne(email, {
        returnRawMongooseObject: true,
      })
      .catch((userError) => {
        throw new NotFoundException(LOGIN_ERROR.EMAIL_NOT_FOUND, {
          cause: userError,
        });
      });
    const isValidPass = await bcrypt.compare(password, user.password);
    if (!isValidPass)
      throw new UnauthorizedException(LOGIN_ERROR.INVALID_PASSWORD);

    const apiConfig = this.configService.get<ApiConfig>('api');
    const needsVerification =
      apiConfig.emailVerification === EmailVerificationOptions.required;
    if (needsVerification && !user.isVerified())
      throw new ForbiddenException(LOGIN_ERROR.EMAIL_NOT_VERIFIED);

    const payload = { _id: user._id.toString(), name: user.name };
    return new LoginResponse(
      new JwtToken(await this.jwtService.signAsync(payload)),
      new User(user.toJSON()),
    );
  }

  async register(email, password): Promise<REGISTRATION_SUCCESS> {
    const newUser = await this.userService.create({ email, password });
    //await this.authService.saveUserConsent(newUser.email); //[GDPR user content]
    if (this.apiConfig.emailVerificationIsOn())
      await this.sendEmailVerification(newUser.email);
    if (this.apiConfig.emailVerificationIsRequired())
      return REGISTRATION_SUCCESS.VERIFY_EMAIL_TO_PROCEED;
    return REGISTRATION_SUCCESS.SUCCESS;
  }

  private async generateSecureUrlSafeToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(48, function (error, buffer) {
        if (error) reject(error);
        // crypto randomBytes include the URL unsafe characters / and +
        // so those need to be replaced for something else like  _ and -
        resolve(
          buffer.toString('base64').replace(/\//g, '_').replace(/\+/g, '-'),
        );
      });
    });
  }

  private async createEmailToken(
    email: string,
  ): Promise<EmailVerificationDocument> {
    const existingToken = await this.emailVerificationModel.findOne({
      email: email,
    });
    if (existingToken) {
      const elapsedMinutes =
        (new Date().getTime() - existingToken.generatedAt.getTime()) / 60000;
      if (elapsedMinutes < 15)
        throw new HttpException(
          EMAIL_VERIFICATION_ERROR.EMAIL_SENT_RECENTLY,
          429,
        );
    }
    const user = await this.userService.findOne(email).catch(() => {
      throw new NotFoundException(EMAIL_VERIFICATION_ERROR.USER_NOT_FOUND);
    });
    if (user.isVerified())
      throw new ForbiddenException(
        EMAIL_VERIFICATION_ERROR.EMAIL_ALREADY_VERIFIED,
      );
    const newEmailVerification = new EmailVerification({
      email: email,
      token: await this.generateSecureUrlSafeToken(),
      generatedAt: new Date(),
    });
    const token = await this.emailVerificationModel.findOneAndUpdate(
      { email: email },
      newEmailVerification,
      { upsert: true, new: true },
    );
    if (!token)
      throw new InternalServerErrorException(
        EMAIL_VERIFICATION_ERROR.TOKEN_NOT_CREATED,
      );
    return token;
  }

  private async createForgottenPasswordToken(
    email: string,
  ): Promise<ForgottenPasswordDocument> {
    const existingToken = await this.forgottenPasswordModel.findOne({
      email: email,
    });
    if (existingToken) {
      const elapsedMinutes =
        (new Date().getTime() - existingToken.generatedAt.getTime()) / 60000;
      if (elapsedMinutes < 15)
        throw new HttpException(FORGOT_PASSWORD_ERROR.EMAIL_SENT_RECENTLY, 429);
    }
    await this.userService.findOne(email).catch(() => {
      throw new NotFoundException(FORGOT_PASSWORD_ERROR.USER_NOT_FOUND);
    });
    const newForgottenPassword = new ForgottenPassword({
      email: email,
      token: await this.generateSecureUrlSafeToken(),
      generatedAt: new Date(),
    });
    const token = await this.forgottenPasswordModel.findOneAndUpdate(
      { email: email },
      newForgottenPassword,
      { upsert: true, new: true },
    );
    if (!token)
      throw new InternalServerErrorException(
        FORGOT_PASSWORD_ERROR.TOKEN_NOT_CREATED,
      );
    return token;
  }

  async verifyEmail(token: string): Promise<boolean> {
    const verification = await this.emailVerificationModel.findOne({
      token: token,
    });
    if (!verification || !verification.email)
      throw new NotFoundException(EMAIL_VERIFICATION_ERROR.TOKEN_NOT_FOUND);

    const verified = await this.userService.verifyEmail(verification.email);
    if (!verified)
      throw new NotFoundException(EMAIL_VERIFICATION_ERROR.USER_NOT_FOUND);

    await verification.deleteOne();
    return true;
  }

  async sendEmailVerification(email: string): Promise<boolean> {
    const verification = await this.createEmailToken(email);
    const sent = await this.mailerService.sendEmailVerification(
      email,
      verification.token,
    );
    return sent;
  }

  async sendEmailForgotPassword(email: string): Promise<boolean> {
    const forgotten = await this.createForgottenPasswordToken(email);
    const sent = await this.mailerService.sendEmailForgotPassword(
      email,
      forgotten.token,
    );
    return sent;
  }

  async resetPasswordFromCurrentPassword(
    email: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    const user = await this.userService
      .findOne(email, {
        returnRawMongooseObject: true,
      })
      .catch(() => {
        throw new NotFoundException(RESET_PASSWORD_ERROR.USER_NOT_FOUND);
      });
    const isValidPass = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPass)
      throw new UnauthorizedException(RESET_PASSWORD_ERROR.UNAUTHORIZED);
    await this.userService.setPassword(email, newPassword);
    return true;
  }

  async resetPasswordFromToken(
    token: string,
    newPassword: string,
  ): Promise<boolean> {
    const forgottenPassword = await this.forgottenPasswordModel.findOne({
      token: token,
    });
    if (!forgottenPassword)
      throw new NotFoundException(RESET_PASSWORD_ERROR.REQUEST_NOT_FOUND);

    // oportunistic email verification, catch and ignore error if it's already verified
    await this.userService
      .verifyEmail(forgottenPassword.email)
      .catch(() => null);

    const elapsedMinutes =
      (new Date().getTime() - forgottenPassword.generatedAt.getTime()) / 60000;
    if (elapsedMinutes > 20)
      throw new GoneException(RESET_PASSWORD_ERROR.LINK_EXPIRED);

    await this.userService.setPassword(forgottenPassword.email, newPassword);
    await forgottenPassword.deleteOne();
    return true;
  }
}
