import { faker } from '@faker-js/faker';
import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection } from 'mongoose';
import * as pactum from 'pactum';
import {
  EMAIL_VERIFICATION_ERROR,
  EMAIL_VERIFICATION_SUCCESS,
  LOGIN_ERROR,
  LOGIN_SUCCESS,
  REGISTRATION_SUCCESS,
} from 'src/auth/auth.constants';
import { MailerService } from 'src/mailer/mailer.service';
import { REGISTRATION_ERROR } from 'src/user/user.constants';
import { UserService } from 'src/user/user.service';
import { AppModule } from './../src/app.module';

const stubUser = { email: 'user@provider.com', password: 'user1234' };
const stubUser2 = { email: 'user2@anotherprovider.com', password: 'user1234' };

const tokensFromEmail = [];
const mockSendTokenEmail = function (
  email: string,
  token: string,
): Promise<boolean> {
  tokensFromEmail.push({ email, token });
  return Promise.resolve(true);
};

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let userService: UserService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailerService)
      .useValue({
        sendEmailVerification: jest.fn(mockSendTokenEmail),
        sendEmailForgotPassword: jest.fn(mockSendTokenEmail),
      })
      .compile();
    app = moduleFixture.createNestApplication();
    const connection = await moduleFixture.resolve<Connection>(
      getConnectionToken(),
    );
    userService = await moduleFixture.resolve(UserService);
    await connection.db.dropDatabase();
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
    const spec = () =>
      pactum
        .spec()
        .post('http://api:3000/auth/email/register')
        .withRequestTimeout(6000);
    it('Should fail with an invalid body and provide an array of validation errors as message', async () => {
      const res = await spec().withBody({}).expectStatus(400).toss();
      expect(Array.isArray(res.body.message)).toEqual(true);
    });
    it('Should succeed', async () => {
      await spec().withBody(stubUser).expectStatus(201).expectJsonLike({
        message: REGISTRATION_SUCCESS.VERIFY_EMAIL_TO_PROCEED,
      });
    });
    it('Should fail when the email is already registered and the password is wrong', async () => {
      await spec()
        .withBody({ ...stubUser, password: 'wrongpass' })
        .expectStatus(409)
        .expectJsonLike({
          message: REGISTRATION_ERROR.EMAIL_ALREADY_REGISTERED,
        });
    });
    describe('Should upgrade to login if email is already registered and password is correct', () => {
      it('Login should fail if email is not verified', async () => {
        await spec().withBody(stubUser).expectStatus(403).expectJsonLike({
          message: LOGIN_ERROR.EMAIL_NOT_VERIFIED,
        });
      });
      it('Login should succeed if email is verified', async () => {
        await userService.verifyEmail(stubUser.email);
        await spec().withBody(stubUser).expectStatus(201).expectJsonLike({
          message: LOGIN_SUCCESS.AUTO_SWITCH,
        });
      });
    });
  });

  describe('/email/login (POST)', () => {
    const spec = () => pactum.spec().post('http://api:3000/auth/email/login');
    it('Should fail with an invalid body and provide an array of validation errors as message', async () => {
      const res = await spec().withBody({}).expectStatus(400).toss();
      expect(Array.isArray(res.body.message)).toEqual(true);
    });
    it('Should fail with a syntactically valid but unregistered email', async () => {
      await spec()
        .withBody({ email: 'unknow@oooops.com', password: '12341234' })
        .expectStatus(404)
        .expectJsonLike({ message: LOGIN_ERROR.EMAIL_NOT_FOUND });
    });
    it('Should fail with incorrect password', async () => {
      await spec()
        .withBody({ ...stubUser, password: 'wrongpass' })
        .expectStatus(401)
        .expectJsonLike({ message: LOGIN_ERROR.INVALID_PASSWORD });
    });
    it('Login should fail if email is not verified ()', async () => {
      await pactum
        .spec()
        .post('http://api:3000/auth/email/register')
        .withRequestTimeout(6000)
        .withBody(stubUser2)
        .expectStatus(201)
        .expectJsonLike({
          message: REGISTRATION_SUCCESS.VERIFY_EMAIL_TO_PROCEED,
        });
      await spec().withBody(stubUser2).expectStatus(403).expectJsonLike({
        message: LOGIN_ERROR.EMAIL_NOT_VERIFIED,
      });
    });
    it('Should succeed with valid credentials and verified email', async () => {
      await spec()
        .withBody(stubUser)
        .expectStatus(201)
        .expectJsonLike({ message: LOGIN_SUCCESS.SUCCESS });
    });
  });

  describe('email/verify/:token', () => {
    const spec = () =>
      pactum.spec().get('http://api:3000/auth/email/verify/{token}');
    it('Should fail with an invalid token', async () => {
      await spec()
        .withPathParams('token', 'someInvalidToken')
        .expectStatus(404)
        .expectJsonLike({ message: EMAIL_VERIFICATION_ERROR.TOKEN_NOT_FOUND });
    });
    it('Should fail with an old token that points to a user that no longer exists', async () => {
      const stubUser = { email: faker.internet.email(), password: 'user1234' };
      await pactum
        .spec()
        .post('http://api:3000/auth/email/register')
        .withRequestTimeout(6000)
        .withBody(stubUser)
        .expectStatus(201);
      await userService.remove(stubUser.email);
      await spec()
        .withPathParams(
          'token',
          tokensFromEmail.find((elem) => elem.email === stubUser.email).token,
        )
        .expectStatus(404)
        .expectJsonLike({ message: EMAIL_VERIFICATION_ERROR.USER_NOT_FOUND });
    });
    it('Should succeed', async () => {
      const stubUser = { email: faker.internet.email(), password: 'user1234' };
      await pactum
        .spec()
        .post('http://api:3000/auth/email/register')
        .withRequestTimeout(6000)
        .withBody(stubUser)
        .expectStatus(201);
      await spec()
        .withPathParams(
          'token',
          tokensFromEmail.find((elem) => elem.email === stubUser.email).token,
        )
        .expectStatus(200)
        .expectJsonLike({ message: EMAIL_VERIFICATION_SUCCESS.SUCCESS });
    });
  });

  describe('email/resend-verification/:email', () => {
    //
  });
  describe('email/forgot-password/:email', () => {
    //
  });
  describe('email/reset-password', () => {
    //
  });
});
