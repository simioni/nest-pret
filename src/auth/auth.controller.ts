import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { StandardParam, StandardParams } from 'nest-standard-response';
import { USER_REGISTRATION_ERROR } from 'src/user/user.constants';
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
import { LoginResponse } from './responses/login.response';

type EmptyObject = Record<string, never>;

// TODO add open api documentation for the StandardResponse of all these routes

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('email/login')
  @ApiOperation({ summary: 'Log a user in' })
  public async login(
    @Body() loginDto: LoginDto,
    @StandardParam() params: StandardParams,
  ): Promise<LoginResponse> {
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
    description:
      'If the email is already registed and the password is correct, this endpoint will auto-upgrade to login instead.',
  })
  public async register(
    @Body() registerDto: RegisterDto,
    @StandardParam() params: StandardParams,
  ): Promise<LoginResponse | EmptyObject> {
    try {
      const registrationMessage = await this.authService.register(
        registerDto.email,
        registerDto.password,
      );
      params.setMessage(registrationMessage);
      if (registrationMessage === REGISTRATION_SUCCESS.VERIFY_EMAIL_TO_PROCEED)
        return {};
      params.setMessage(REGISTRATION_SUCCESS.AUTO_LOGIN);
      return await this.authService.login(
        registerDto.email,
        registerDto.password,
      );
    } catch (registrationError) {
      const userExists =
        registrationError.response.message ===
        USER_REGISTRATION_ERROR.EMAIL_ALREADY_REGISTERED;
      if (!userExists) throw registrationError;
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
  }

  @Get('email/verify/:token')
  @ApiOperation({ summary: 'Verify an email using the token sent to email' })
  public async verifyEmail(
    @Param('token') token: string,
    @StandardParam() params: StandardParams,
  ): Promise<EmptyObject> {
    await this.authService.verifyEmail(token);
    params.setMessage(EMAIL_VERIFICATION_SUCCESS.SUCCESS);
    return {};
  }

  @Post('email/resend-verification/:email')
  @ApiOperation({
    summary:
      'Resend the email with the verification token in case the first one was lost',
  })
  public async sendEmailVerification(
    @Param() { email }: EmailDto,
    @StandardParam() params: StandardParams,
  ): Promise<EmptyObject> {
    await this.authService.sendEmailVerification(email);
    params.setMessage(EMAIL_VERIFICATION_SUCCESS.EMAIL_RESENT);
    return {};
  }

  @Post('email/forgot-password/:email')
  @ApiOperation({
    summary: 'Send an email with a link to create a new password',
  })
  public async sendEmailForgotPassword(
    @Param() { email }: EmailDto,
    @StandardParam() params: StandardParams,
  ): Promise<EmptyObject> {
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
  public async setNewPassord(
    @Body() resetPassword: ResetPasswordDto,
    @StandardParam() params: StandardParams,
  ): Promise<EmptyObject> {
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
