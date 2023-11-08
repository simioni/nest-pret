import { INestApplication } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import * as pactum from 'pactum';
import { VALIDATION_ERROR } from '../src/app.constants';
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
} from '../src/auth/auth.constants';
import { AuthService } from '../src/auth/auth.service';
import {
  EmailVerification,
  EmailVerificationDocument,
} from '../src/auth/schemas/email-verification.schema';
import {
  ForgottenPassword,
  ForgottenPasswordDocument,
} from '../src/auth/schemas/forgotten-password.schema';
import { USER_REGISTRATION_ERROR } from '../src/user/user.constants';
import { UserService } from '../src/user/user.service';
import { TestingServer } from './config/setup-test-server';
import { UserStubFactory } from './stubs/user-stub.factory';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let mongooseConnection: Connection;
  let authService: AuthService;
  let userService: UserService;
  let getEmailVerificationTokenFor: (email: string) => Promise<string>;
  let emailVerificationModel: Model<EmailVerificationDocument>;
  let forgottenPasswordModel: Model<ForgottenPasswordDocument>;
  let baseUrl: string;
  let stub: UserStubFactory;

  beforeAll(async () => {
    const testingServer = await new TestingServer().create();
    const testingModule = testingServer.getModule();
    app = testingServer.getApp();
    baseUrl = testingServer.getBaseUrl();
    userService = await testingModule.resolve(UserService);
    authService = await testingModule.resolve(AuthService);
    emailVerificationModel = await testingModule.resolve(
      getModelToken(EmailVerification.name),
    );
    forgottenPasswordModel = await testingModule.resolve(
      getModelToken(ForgottenPassword.name),
    );
    getEmailVerificationTokenFor = async (email) => {
      const verification = await emailVerificationModel.findOne({ email });
      return verification.token;
    };
    stub = new UserStubFactory(testingServer);
    mongooseConnection = await testingModule.resolve(getConnectionToken());
    await mongooseConnection.db.dropDatabase();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
    expect(userService).toBeDefined();
    expect(authService).toBeDefined();
  });

  describe('/email/register (POST)', () => {
    const spec = () => pactum.spec().post(`${baseUrl}/auth/email/register`);
    let user;
    beforeAll(async () => {
      user = stub.createFakeUser({ firstName: 'John' });
    });
    afterAll(async () => {
      await stub.deleteUser(user.email);
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
      await spec().withBody(user).expectStatus(201).expectJsonLike({
        message: REGISTRATION_SUCCESS.VERIFY_EMAIL_TO_PROCEED,
      });
    });
    it('Should fail when the email is already registered and the password is wrong', async () => {
      await spec()
        .withBody({ ...user, password: 'wrongpass' })
        .expectStatus(409)
        .expectJsonLike({
          message: USER_REGISTRATION_ERROR.EMAIL_ALREADY_REGISTERED,
        });
    });
    describe('Should upgrade to login if email is already registered and password is correct', () => {
      it('Login should fail if email is not verified', async () => {
        await spec().withBody(user).expectStatus(403).expectJsonLike({
          message: LOGIN_ERROR.EMAIL_NOT_VERIFIED,
        });
      });
      it('Login should succeed if email is verified', async () => {
        await authService.verifyEmail(
          await await getEmailVerificationTokenFor(user.email),
        );
        await spec().withBody(user).expectStatus(201).expectJsonLike({
          message: LOGIN_SUCCESS.AUTO_SWITCH,
        });
      });
    });
  });

  describe('/email/login (POST)', () => {
    const spec = () => pactum.spec().post(`${baseUrl}/auth/email/login`);
    let unregisteredUser;
    let registeredUser;
    beforeAll(async () => {
      unregisteredUser = stub.createFakeUser();
      registeredUser = await stub.registerNewUser();
    });
    afterAll(async () => {
      await stub.deleteUser(unregisteredUser.email);
      await stub.deleteUser(registeredUser.email);
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
        .withBody(unregisteredUser)
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
    let user;
    let deletedUser;
    beforeAll(async () => {
      user = await stub.registerNewUser({ firstName: 'Mark' });
      deletedUser = await stub.registerNewUser({ firstName: 'Katerine' });
      await userService.remove(deletedUser.email);
    });
    afterAll(async () => {
      stub.deleteUser(user.email);
      // stub.deleteUser(deletedUser.email);
    });
    it('Should fail with an invalid token', async () => {
      await spec()
        .withPathParams('token', 'someInvalidToken')
        .expectStatus(404)
        .expectJsonLike({ message: EMAIL_VERIFICATION_ERROR.TOKEN_NOT_FOUND });
    });
    it('Should fail with an old token that points to a user that no longer exists', async () => {
      await spec()
        .withPathParams(
          'token',
          await getEmailVerificationTokenFor(deletedUser.email),
        )
        .expectStatus(404)
        .expectJsonLike({ message: EMAIL_VERIFICATION_ERROR.USER_NOT_FOUND });
    });
    it('Should succeed', async () => {
      await spec()
        .withPathParams('token', await getEmailVerificationTokenFor(user.email))
        .expectStatus(200)
        .expectJsonLike({ message: EMAIL_VERIFICATION_SUCCESS.SUCCESS });
    });
  });

  describe('email/resend-verification/:email (POST)', () => {
    const spec = () =>
      pactum.spec().post(`${baseUrl}/auth/email/resend-verification/{email}`);
    let unregisteredUser;
    let registeredUser;
    let verifiedUser;
    beforeAll(async () => {
      unregisteredUser = stub.createFakeUser({ firstName: 'John' });
      registeredUser = await stub.registerNewUser({ firstName: 'Mary' });
      verifiedUser = await stub.registerNewUser({ firstName: 'Matt' });
      await authService.verifyEmail(
        await getEmailVerificationTokenFor(verifiedUser.email),
      );
    });
    afterAll(async () => {
      stub.deleteUser(registeredUser.email);
      stub.deleteUser(verifiedUser.email);
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
      const partialUpdate = new EmailVerification({
        generatedAt: new Date(new Date().getTime() - 20 * 60 * 1000),
      });
      await emailVerificationModel.findOneAndUpdate(
        { email: registeredUser.email },
        partialUpdate,
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
    let unregisteredUser;
    let registeredUser;
    beforeAll(async () => {
      unregisteredUser = stub.createFakeUser({ firstName: 'Charles' });
      registeredUser = await stub.registerNewUser({ firstName: 'Jackline' });
    });
    afterAll(async () => {
      stub.deleteUser(unregisteredUser.email);
      stub.deleteUser(registeredUser.email);
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
    let unregisteredUser;
    let registeredUser;
    beforeAll(async () => {
      unregisteredUser = stub.createFakeUser({ firstName: 'Patrick' });
      registeredUser = await stub.registerNewUser({ firstName: 'Dawson' });
    });
    afterAll(async () => {
      stub.deleteUser(unregisteredUser.email);
      stub.deleteUser(registeredUser.email);
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
      const partialUpdate = new ForgottenPassword({
        generatedAt: new Date(new Date().getTime() - 30 * 60 * 1000),
      });
      const forgottenPassword = await forgottenPasswordModel.findOneAndUpdate(
        { email: registeredUser.email },
        partialUpdate,
        { new: true },
      );
      await spec()
        .withBody({
          email: registeredUser.email,
          password: registeredUser.password,
          resetPasswordToken: forgottenPassword.token,
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
          resetPasswordToken: forgottenPassword.token,
        })
        .expectStatus(200)
        .expectJsonLike({ message: RESET_PASSWORD_SUCCESS.SUCCESS });
    });
  });
});
