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
import {
  EMAIL_VERIFICATION_ERROR,
  FORGOT_PASSWORD_ERROR,
  LOGIN_ERROR,
} from './auth.constants';
import { MailerService } from 'src/mailer/mailer.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(EmailVerification.name)
    private readonly emailVerificationModel: Model<EmailVerificationDocument>,
    @InjectModel(ForgottenPassword.name)
    private readonly forgottenPasswordModel: Model<ForgottenPasswordDocument>,
    private configService: ConfigService,
    private mailerService: MailerService,
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async login(email, password) {
    let user: Partial<UserDocument>;
    try {
      user = await this.userService.findOne(email, {
        returnRawMongooseObject: true,
      });
    } catch (userError) {
      throw new NotFoundException(LOGIN_ERROR.EMAIL_NOT_FOUND, {
        cause: userError,
      });
    }

    const isValidPass = await bcrypt.compare(password, user.password);
    if (!isValidPass)
      throw new UnauthorizedException(LOGIN_ERROR.INVALID_PASSWORD);

    const apiConfig = this.configService.get<ApiConfig>('api');
    const needsVerification =
      apiConfig.emailVerification === EmailVerificationOptions.required;
    if (needsVerification && !user.isVerified())
      throw new ForbiddenException(LOGIN_ERROR.EMAIL_NOT_VERIFIED);

    const payload = { _id: user._id.toString(), name: user.name };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: new User(user.toJSON()),
    };
  }

  private async createEmailToken(
    email: string,
  ): Promise<EmailVerificationDocument> {
    const existingToken = await this.emailVerificationModel.findOne({
      email: email,
    });
    if (existingToken) {
      const elapsedMinutes =
        (new Date().getTime() - existingToken.timestamp.getTime()) / 60000;
      if (elapsedMinutes < 15)
        throw new HttpException(EMAIL_VERIFICATION_ERROR.SENT_RECENTLY, 429);
    }

    const user = await this.userService.findOne(email);
    if (!user)
      throw new NotFoundException(EMAIL_VERIFICATION_ERROR.USER_NOT_FOUND);
    if (user.isVerified())
      throw new ForbiddenException(EMAIL_VERIFICATION_ERROR.ALREADY_VERIFIED);

    const token = await this.emailVerificationModel.findOneAndUpdate(
      { email: email },
      {
        email: email,
        emailToken: (Math.floor(Math.random() * 9000000) + 1000000).toString(), //Generate 7 digits number
        timestamp: new Date(),
      },
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
        (new Date().getTime() - existingToken.timestamp.getTime()) / 60000;
      if (elapsedMinutes < 15)
        throw new HttpException(FORGOT_PASSWORD_ERROR.SENT_RECENTLY, 429);
    }

    const user = await this.userService.findOne(email);
    if (!user)
      throw new NotFoundException(FORGOT_PASSWORD_ERROR.USER_NOT_FOUND);

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
    if (!token)
      throw new InternalServerErrorException(
        FORGOT_PASSWORD_ERROR.TOKEN_NOT_CREATED,
      );
    return token;
  }

  async verifyEmail(token: string): Promise<boolean> {
    const verification = await this.emailVerificationModel.findOne({
      emailToken: token,
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
      verification.emailToken,
    );
    return sent;
  }

  async sendEmailForgotPassword(email: string): Promise<boolean> {
    const forgotten = await this.createForgottenPasswordToken(email);
    const sent = await this.mailerService.sendEmailForgotPassword(
      email,
      forgotten.newPasswordToken,
    );
    return sent;
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

    const elapsedMinutes =
      (new Date().getTime() - forgottenPassword.timestamp.getTime()) / 60000;
    if (elapsedMinutes > 20)
      throw new GoneException('RESET_PASSWORD.LINK_EXPIRED');

    await this.userService.setPassword(forgottenPassword.email, newPassword);
    await forgottenPassword.deleteOne();
    return true;
  }
}
