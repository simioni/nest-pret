import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection, Model } from 'mongoose';
import * as pactum from 'pactum';
import { VALIDATION_ERROR } from 'src/app.constants';
import {
  EMAIL_VERIFICATION_ERROR,
  EMAIL_VERIFICATION_SUCCESS,
  FORGOT_PASSWORD_ERROR,
  FORGOT_PASSWORD_SUCCESS,
  LOGIN_ERROR,
  LOGIN_SUCCESS,
  REGISTRATION_SUCCESS,
  RESET_PASSWORD_ERROR,
  RESET_PASSWORD_SUCCESS,
} from 'src/auth/auth.constants';
import { AuthService } from 'src/auth/auth.service';
import {
  EmailVerification,
  EmailVerificationDocument,
} from 'src/auth/schemas/email-verification.schema';
import {
  ForgottenPassword,
  ForgottenPasswordDocument,
} from 'src/auth/schemas/forgotten-password.schema';
import { MailerService } from 'src/mailer/mailer.service';
import { REGISTRATION_ERROR } from 'src/user/user.constants';
import { UserService } from 'src/user/user.service';
import { AppModule } from './../src/app.module';
import { createFakeUser, FakeUser, FakeUserOptions } from './stubs/user.stub';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let mongooseConnection: Connection;
  let configService: ConfigService;
  let authService: AuthService;
  let userService: UserService;
  let registerNewUser: (options?: FakeUserOptions) => Promise<FakeUser>;
  let getEmailVerificationTokenFor: (email: string) => Promise<string>;
  let emailVerificationModel: Model<EmailVerificationDocument>;
  let forgottenPasswordModel: Model<ForgottenPasswordDocument>;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailerService)
      .useValue({
        sendEmailVerification: jest.fn(),
        sendEmailForgotPassword: jest.fn(),
      })
      .compile();
    app = moduleFixture.createNestApplication();
    userService = await moduleFixture.resolve(UserService);
    authService = await moduleFixture.resolve(AuthService);
    configService = await moduleFixture.resolve(ConfigService);
    baseUrl =
      configService.get('host.internalUrl') +
      ':' +
      configService.get('host.internalPort');
    emailVerificationModel = await moduleFixture.resolve(
      getModelToken(EmailVerification.name),
    );
    forgottenPasswordModel = await moduleFixture.resolve(
      getModelToken(ForgottenPassword.name),
    );
    getEmailVerificationTokenFor = async (email) => {
      const verification = await emailVerificationModel.findOne({ email });
      return verification.emailToken;
    };
    registerNewUser = async (options) => {
      const stubUser = createFakeUser(options);
      await pactum
        .spec()
        .post(`${baseUrl}/auth/email/register`)
        .withRequestTimeout(6000)
        .withBody(stubUser)
        .expectStatus(201);
      return stubUser;
    };
    mongooseConnection = await moduleFixture.resolve(getConnectionToken());
    await mongooseConnection.db.dropDatabase();
    await app.init();
    await app.listen(3000);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
    expect(userService).toBeDefined();
  });

  describe('/email/register (POST)', () => {
    const spec = () => pactum.spec().post(`${baseUrl}/auth/email/register`);
    const userStub = createFakeUser({ firstName: 'John' });
    beforeAll(async () => {
      await mongooseConnection.db.dropDatabase();
    });
    it('Should fail with an invalid body and provide an array of validation errors as message', async () => {
      const res = await spec().withBody({}).expectStatus(400).toss();
      expect(res.body.message).toEqual(VALIDATION_ERROR.ERROR);
      expect(Array.isArray(res.body.errors)).toEqual(true);
      expect(
        res.body.errors.find((elem) => elem.field === 'email').errors.isEmail,
      ).toBeDefined();
      expect(
        res.body.errors.find((elem) => elem.field === 'password').errors
          .minLength,
      ).toBeDefined();
    });
    it('Should succeed', async () => {
      await spec().withBody(userStub).expectStatus(201).expectJsonLike({
        message: REGISTRATION_SUCCESS.VERIFY_EMAIL_TO_PROCEED,
      });
    });
    it('Should fail when the email is already registered and the password is wrong', async () => {
      await spec()
        .withBody({ ...userStub, password: 'wrongpass' })
        .expectStatus(409)
        .expectJsonLike({
          message: REGISTRATION_ERROR.EMAIL_ALREADY_REGISTERED,
        });
    });
    describe('Should upgrade to login if email is already registered and password is correct', () => {
      it('Login should fail if email is not verified', async () => {
        await spec().withBody(userStub).expectStatus(403).expectJsonLike({
          message: LOGIN_ERROR.EMAIL_NOT_VERIFIED,
        });
      });
      it('Login should succeed if email is verified', async () => {
        await authService.verifyEmail(
          await await getEmailVerificationTokenFor(userStub.email),
        );
        await spec().withBody(userStub).expectStatus(201).expectJsonLike({
          message: LOGIN_SUCCESS.AUTO_SWITCH,
        });
      });
    });
  });

  describe('/email/login (POST)', () => {
    const spec = () => pactum.spec().post(`${baseUrl}/auth/email/login`);
    const unregisteredUserStub = createFakeUser();
    let registeredUser;
    beforeAll(async () => {
      await mongooseConnection.db.dropDatabase();
      registeredUser = await registerNewUser();
    });
    it('Should fail with an invalid body and provide an array of validation errors as message', async () => {
      const res = await spec().withBody({}).expectStatus(400).toss();
      expect(res.body.message).toEqual(VALIDATION_ERROR.ERROR);
      expect(Array.isArray(res.body.errors)).toEqual(true);
      expect(
        res.body.errors.find((elem) => elem.field === 'email').errors.isEmail,
      ).toBeDefined();
      expect(
        res.body.errors.find((elem) => elem.field === 'password').errors
          .minLength,
      ).toBeDefined();
    });
    it('Should fail with a syntactically valid but unregistered email', async () => {
      await spec()
        .withBody(unregisteredUserStub)
        .expectStatus(404)
        .expectJsonLike({ message: LOGIN_ERROR.EMAIL_NOT_FOUND });
    });
    it('Should fail with incorrect password', async () => {
      await spec()
        .withBody({ ...registeredUser, password: 'wrongpass' })
        .expectStatus(401)
        .expectJsonLike({ message: LOGIN_ERROR.INVALID_PASSWORD });
    });
    it('Login should fail if email is not verified ()', async () => {
      await spec().withBody(registeredUser).expectStatus(403).expectJsonLike({
        message: LOGIN_ERROR.EMAIL_NOT_VERIFIED,
      });
    });
    it('Should succeed with valid credentials and verified email', async () => {
      await userService.verifyEmail(registeredUser.email);
      await spec()
        .withBody(registeredUser)
        .expectStatus(201)
        .expectJsonLike({ message: LOGIN_SUCCESS.SUCCESS });
    });
  });

  describe('email/verify/:token (GET)', () => {
    const spec = () =>
      pactum.spec().get(`${baseUrl}/auth/email/verify/{token}`);
    beforeAll(async () => {
      await mongooseConnection.db.dropDatabase();
    });
    it('Should fail with an invalid token', async () => {
      await spec()
        .withPathParams('token', 'someInvalidToken')
        .expectStatus(404)
        .expectJsonLike({ message: EMAIL_VERIFICATION_ERROR.TOKEN_NOT_FOUND });
    });
    it('Should fail with an old token that points to a user that no longer exists', async () => {
      const stubUser = await registerNewUser();
      await userService.remove(stubUser.email);
      await spec()
        .withPathParams(
          'token',
          await getEmailVerificationTokenFor(stubUser.email),
        )
        .expectStatus(404)
        .expectJsonLike({ message: EMAIL_VERIFICATION_ERROR.USER_NOT_FOUND });
    });
    it('Should succeed', async () => {
      const stubUser = await registerNewUser();
      await spec()
        .withPathParams(
          'token',
          await getEmailVerificationTokenFor(stubUser.email),
        )
        .expectStatus(200)
        .expectJsonLike({ message: EMAIL_VERIFICATION_SUCCESS.SUCCESS });
    });
  });

  describe('email/resend-verification/:email (POST)', () => {
    const spec = () =>
      pactum.spec().post(`${baseUrl}/auth/email/resend-verification/{email}`);
    const unregisteredUser = createFakeUser({ firstName: 'John' });
    let registeredUser;
    let verifiedUser;
    beforeAll(async () => {
      await mongooseConnection.db.dropDatabase();
      registeredUser = await registerNewUser({ firstName: 'Mary' });
      verifiedUser = await registerNewUser({ firstName: 'Matt' });
      await authService.verifyEmail(
        await getEmailVerificationTokenFor(verifiedUser.email),
      );
    });
    it('Should fail with an invalid email and provide an array of validation errors as message', async () => {
      const res = await spec()
        .withPathParams('email', 'notanactual@email')
        .expectStatus(400)
        .toss();
      expect(res.body.message).toEqual(VALIDATION_ERROR.ERROR);
      expect(Array.isArray(res.body.errors)).toEqual(true);
      expect(
        res.body.errors.find((elem) => elem.field === 'email').errors.isEmail,
      ).toBeDefined();
    });
    it('Should fail with a syntactically valid but unregistered email', async () => {
      await spec()
        .withPathParams('email', unregisteredUser.email)
        .expectStatus(404)
        .expectJsonLike({ message: EMAIL_VERIFICATION_ERROR.USER_NOT_FOUND });
    });
    it('Should fail for an already verified email', async () => {
      await spec()
        .withPathParams('email', verifiedUser.email)
        .expectStatus(403)
        .expectJsonLike({
          message: EMAIL_VERIFICATION_ERROR.EMAIL_ALREADY_VERIFIED,
        });
    });
    it('Should fail if a verification email was already been sent recently', async () => {
      await spec()
        .withPathParams('email', registeredUser.email)
        .expectStatus(429)
        .expectJsonLike({
          message: EMAIL_VERIFICATION_ERROR.EMAIL_SENT_RECENTLY,
        });
    });
    it('Should succeed if enough time has passed since an email was last sent', async () => {
      await emailVerificationModel.findOneAndUpdate(
        { email: registeredUser.email },
        { timestamp: new Date(new Date().getTime() - 20 * 60 * 1000) },
      );
      await spec()
        .withPathParams('email', registeredUser.email)
        .expectStatus(201)
        .expectJsonLike({ message: EMAIL_VERIFICATION_SUCCESS.EMAIL_RESENT });
    });
  });

  describe('email/forgot-password/:email (POST)', () => {
    const spec = () =>
      pactum.spec().post(`${baseUrl}/auth/email/forgot-password/{email}`);
    const unregisteredUser = createFakeUser({ firstName: 'Charles' });
    let registeredUser;
    beforeAll(async () => {
      await mongooseConnection.db.dropDatabase();
      registeredUser = await registerNewUser({ firstName: 'Jackline' });
    });
    it('Should fail with an invalid email and provide an array of validation errors as message', async () => {
      const res = await spec()
        .withPathParams('email', 'notanactual@email')
        .expectStatus(400)
        .toss();
      expect(res.body.message).toEqual(VALIDATION_ERROR.ERROR);
      expect(Array.isArray(res.body.errors)).toEqual(true);
      expect(
        res.body.errors.find((elem) => elem.field === 'email').errors.isEmail,
      ).toBeDefined();
    });
    it('Should fail with a syntactically valid but unregistered email', async () => {
      await spec()
        .withPathParams('email', unregisteredUser.email)
        .expectStatus(404)
        .expectJsonLike({ message: FORGOT_PASSWORD_ERROR.USER_NOT_FOUND });
    });
    it('Should succeed', async () => {
      await spec()
        .withPathParams('email', registeredUser.email)
        .expectStatus(201)
        .expectJsonLike({ message: FORGOT_PASSWORD_SUCCESS.EMAIL_SENT });
    });
    it('Should fail if a forgot password email was already been sent recently', async () => {
      await spec()
        .withPathParams('email', registeredUser.email)
        .expectStatus(429)
        .expectJsonLike({
          message: FORGOT_PASSWORD_ERROR.EMAIL_SENT_RECENTLY,
        });
    });
  });

  describe('email/reset-password (POST)', () => {
    const spec = () =>
      pactum.spec().post(`${baseUrl}/auth/email/reset-password`);
    const unregisteredUser = createFakeUser({ firstName: 'Patrick' });
    let registeredUser;
    beforeAll(async () => {
      await mongooseConnection.db.dropDatabase();
      registeredUser = await registerNewUser({ firstName: 'Dawson' });
    });
    it('Should fail with an invalid body and provide an array of validation errors as message', async () => {
      const res = await spec().expectStatus(400).toss();
      expect(res.body.message).toEqual(VALIDATION_ERROR.ERROR);
      expect(Array.isArray(res.body.errors)).toEqual(true);
      expect(
        res.body.errors.find((elem) => elem.field === 'email').errors.isEmail,
      ).toBeDefined();
      expect(
        res.body.errors.find((elem) => elem.field === 'password').errors
          .minLength,
      ).toBeDefined();
      expect(
        res.body.errors.find((elem) => elem.field === 'currentPassword').errors
          .isString,
      ).toBeDefined();
      expect(
        res.body.errors.find((elem) => elem.field === 'resetPasswordToken')
          .errors.isString,
      ).toBeDefined();
    });
    it('Should only validate resetPasswordToken if currentPassword is missing', async () => {
      const res = await spec()
        .withBody({
          email: registeredUser.email,
          currentPassword: registeredUser.password,
        })
        .expectStatus(400)
        .toss();
      expect(res.body.message).toEqual(VALIDATION_ERROR.ERROR);
      expect(Array.isArray(res.body.errors)).toEqual(true);
      expect(
        res.body.errors.find((elem) => elem.field === 'resetPasswordToken'),
      ).toBeUndefined();
    });
    it('Should only validate currentPassword if resetPasswordToken is missing', async () => {
      const res = await spec()
        .withBody({
          email: registeredUser.email,
          resetPasswordToken: '12341234',
        })
        .expectStatus(400)
        .toss();
      expect(res.body.message).toEqual(VALIDATION_ERROR.ERROR);
      expect(Array.isArray(res.body.errors)).toEqual(true);
      expect(
        res.body.errors.find((elem) => elem.field === 'currentPassword'),
      ).toBeUndefined();
    });
    it('Should fail with a syntactically valid but unregistered email', async () => {
      await spec()
        .withBody({
          email: unregisteredUser.email,
          currentPassword: unregisteredUser.password,
          password: '12341234',
        })
        .expectStatus(404)
        .expectJsonLike({ message: RESET_PASSWORD_ERROR.USER_NOT_FOUND });
    });
    it('Should fail with if the current password is incorrect', async () => {
      await spec()
        .withBody({
          email: registeredUser.email,
          currentPassword: 'wrongPassword',
          password: '12341234',
        })
        .expectStatus(401)
        .expectJsonLike({ message: RESET_PASSWORD_ERROR.UNAUTHORIZED });
    });
    it('Should fail with an invalid token', async () => {
      await spec()
        .withBody({
          email: registeredUser.email,
          password: registeredUser.password,
          resetPasswordToken: '12341234',
        })
        .expectStatus(404)
        .expectJsonLike({ message: RESET_PASSWORD_ERROR.REQUEST_NOT_FOUND });
    });
    it('Should fail with an expired token', async () => {
      await authService.sendEmailForgotPassword(registeredUser.email);
      const forgottenPassword = await forgottenPasswordModel.findOneAndUpdate(
        { email: registeredUser.email },
        { timestamp: new Date(new Date().getTime() - 30 * 60 * 1000) },
        { new: true },
      );
      await spec()
        .withBody({
          email: registeredUser.email,
          password: registeredUser.password,
          resetPasswordToken: forgottenPassword.newPasswordToken,
        })
        .expectStatus(410)
        .expectJsonLike({ message: RESET_PASSWORD_ERROR.LINK_EXPIRED });
    });
    it("Should oportuniscally verify an email when the token is confirmed (even if it's expired)", async () => {
      const user = await userService.findOne(registeredUser.email);
      expect(user.isVerified()).toEqual(true);
    });
    it('Should succeed', async () => {
      await authService.sendEmailForgotPassword(registeredUser.email);
      const forgottenPassword = await forgottenPasswordModel.findOne({
        email: registeredUser.email,
      });
      await spec()
        .withBody({
          email: registeredUser.email,
          password: registeredUser.password,
          resetPasswordToken: forgottenPassword.newPasswordToken,
        })
        .expectStatus(200)
        .expectJsonLike({ message: RESET_PASSWORD_SUCCESS.SUCCESS });
    });
  });
});
