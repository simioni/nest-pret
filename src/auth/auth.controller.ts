import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { StandardParam, StandardParams } from 'nest-standard-response';
import {
  ApiConfig,
  EmailVerificationOptions,
} from 'src/config/interfaces/api-config.interface';
import { REGISTRATION_ERROR } from 'src/user/user.constants';
import { UserService } from 'src/user/user.service';
import {
  EMAIL_VERIFICATION_SUCCESS,
  FORGOT_PASSWORD_SUCCESS,
  LOGIN_ERROR,
  LOGIN_SUCCESS,
  REGISTRATION_SUCCESS,
  RESET_PASSWORD_SUCCESS,
} from './auth.constants';
import { AuthService } from './auth.service';
import { EmailDto } from './dto/email.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  private apiConfig: ApiConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {
    this.apiConfig = this.configService.get<ApiConfig>('api');
  }

  @Post('email/login')
  @ApiOperation({
    summary: 'Log a user in',
  })
  async login(
    @Body() loginDto: LoginDto,
    @StandardParam() params: StandardParams,
  ) {
    const login = await this.authService.login(
      loginDto.email,
      loginDto.password,
    );
    params.setMessage(LOGIN_SUCCESS.SUCCESS);
    return login;
  }

  @Post('email/register')
  @ApiOperation({
    summary: 'Register a new user and send an email verification to them',
  })
  async register(
    @Body() registerDto: RegisterDto,
    @StandardParam() params: StandardParams,
  ) {
    try {
      const newUser = await this.userService.create(registerDto);
      //await this.authService.saveUserConsent(newUser.email); //[GDPR user content]
      if (this.apiConfig.emailVerification !== EmailVerificationOptions.off)
        await this.authService.sendEmailVerification(newUser.email);
      if (
        this.apiConfig.emailVerification === EmailVerificationOptions.required
      ) {
        params.setMessage(REGISTRATION_SUCCESS.VERIFY_EMAIL_TO_PROCEED);
        return {};
      }
      params.setMessage(REGISTRATION_SUCCESS.AUTO_LOGIN);
      return await this.authService.login(
        registerDto.email,
        registerDto.password,
      );
    } catch (registrationError) {
      if (
        registrationError.response.message ===
        REGISTRATION_ERROR.EMAIL_ALREADY_REGISTERED
      ) {
        // auto-switch to login for frictionless UX
        const loginResponse = await this.authService
          .login(registerDto.email, registerDto.password)
          .catch((loginError) => {
            if (loginError.response.message === LOGIN_ERROR.EMAIL_NOT_VERIFIED)
              throw loginError;
            else throw registrationError;
          });
        params.setMessage(LOGIN_SUCCESS.AUTO_SWITCH);
        return loginResponse;
      }
      throw registrationError;
    }
  }

  @Get('email/verify/:token')
  @ApiOperation({ summary: 'Verify an email using the token sent to email' })
  async verifyEmail(
    @Param('token') token: string,
    @StandardParam() params: StandardParams,
  ) {
    await this.authService.verifyEmail(token);
    params.setMessage(EMAIL_VERIFICATION_SUCCESS.SUCCESS);
    return {};
  }

  @Post('email/resend-verification/:email')
  @ApiOperation({
    summary:
      'Resend the email with the verification token in case the first one was lost',
  })
  async sendEmailVerification(
    @Param() { email }: EmailDto,
    @StandardParam() params: StandardParams,
  ) {
    await this.authService.sendEmailVerification(email);
    params.setMessage(EMAIL_VERIFICATION_SUCCESS.EMAIL_RESENT);
    return {};
  }

  @Post('email/forgot-password/:email')
  @ApiOperation({
    summary: 'Send an email with a link to create a new password',
  })
  async sendEmailForgotPassword(
    @Param() { email }: EmailDto,
    @StandardParam() params: StandardParams,
  ) {
    await this.authService.sendEmailForgotPassword(email);
    params.setMessage(FORGOT_PASSWORD_SUCCESS.EMAIL_SENT);
    return {};
  }

  @Post('email/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Set a new password for a user, requiring either the current password or a token send via email',
  })
  async setNewPassord(
    @Body() resetPassword: ResetPasswordDto,
    @StandardParam() params: StandardParams,
  ) {
    if (resetPassword.resetPasswordToken) {
      await this.authService.resetPasswordFromToken(
        resetPassword.resetPasswordToken,
        resetPassword.password,
      );
    } else {
      await this.authService.resetPasswordFromCurrentPassword(
        resetPassword.email,
        resetPassword.currentPassword,
        resetPassword.password,
      );
    }
    params.setMessage(RESET_PASSWORD_SUCCESS.SUCCESS);
    return {};
  }
}
