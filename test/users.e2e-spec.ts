import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as pactum from 'pactum';
import { UserService } from '../src/user/user.service';
import { TestingServer } from './config/setup-test-server';
// import { getApp, getBaseUrl, getTestingModule } from './config/setup-e2e-tests';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let mongooseConnection: Connection;
  let configService: ConfigService;
  // let authService: AuthService;
  let userService: UserService;
  // let registerNewUser: (options?: FakeUserOptions) => Promise<FakeUser>;
  // let getEmailVerificationTokenFor: (email: string) => Promise<string>;
  // let emailVerificationModel: Model<EmailVerificationDocument>;
  // let forgottenPasswordModel: Model<ForgottenPasswordDocument>;
  let baseUrl: string;

  beforeAll(async () => {
    // const testingServer: TestingServer = global.testingServer;
    const testingServer = await new TestingServer().create();
    const testingModule = testingServer.getModule();
    app = testingServer.getApp();
    baseUrl = testingServer.getBaseUrl();
    // const testingModule = getTestingModule();
    // const moduleFixture: TestingModule = await Test.createTestingModule({
    //   imports: [AppModule],
    // })
    //   .overrideProvider(MailerService)
    //   .useValue({
    //     sendEmailVerification: jest.fn(),
    //     sendEmailForgotPassword: jest.fn(),
    //   })
    //   .compile();
    // app = getApp();
    // const port = getPort();
    // app = testingModule.createNestApplication();
    userService = await testingModule.resolve(UserService);
    // authService = await moduleFixture.resolve(AuthService);
    configService = await testingModule.resolve(ConfigService);
    // const port = await getDynamicPort(
    //   __filename,
    //   __dirname,
    //   configService.get('host.internalPort'),
    // );
    // baseUrl = `${configService.get('host.internalUrl')}:${port}`;
    // baseUrl = getBaseUrl();
    // emailVerificationModel = await testingModule.resolve(
    //   getModelToken(EmailVerification.name),
    // );
    // forgottenPasswordModel = await testingModule.resolve(
    //   getModelToken(ForgottenPassword.name),
    // );
    // getEmailVerificationTokenFor = async (email) => {
    //   const verification = await emailVerificationModel.findOne({ email });
    //   return verification.token;
    // };
    // registerNewUser = async (options) => {
    //   const stubUser = createFakeUser(options);
    //   await pactum
    //     .spec()
    //     .post(`${baseUrl}/auth/email/register`)
    //     .withRequestTimeout(6000)
    //     .withBody(stubUser)
    //     .expectStatus(201);
    //   return stubUser;
    // };
    mongooseConnection = await testingModule.resolve(getConnectionToken());
    await mongooseConnection.db.dropDatabase();
    // await app.init();
    // await app.listen(port);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
    expect(userService).toBeDefined();
  });

  describe('/ (GET)', () => {
    const spec = () => pactum.spec().get(`${baseUrl}/user`);
    it('Should fail without an authenticated user', async () => {
      await spec().expectStatus(401);
    });
    // it('Should succeed', async () => {
    //   await spec().expectStatus(200).expectJsonLike({
    //     message: REGISTRATION_SUCCESS.VERIFY_EMAIL_TO_PROCEED,
    //   });
    // });
  });

  describe('/ (POST)', () => {
    const spec = () => pactum.spec().post(`${baseUrl}/user`);
    it('Should fail without an authenticated user', async () => {
      await spec().expectStatus(401);
    });
  });

  describe('/:idOrEmail (GET)', () => {
    const spec = () => pactum.spec().get(`${baseUrl}/user/{idOrEmail}`);
    it('Should fail without an authenticated user', async () => {
      await spec().expectStatus(401);
    });
  });

  describe('/:idOrEmail (PATCH)', () => {
    const spec = () => pactum.spec().patch(`${baseUrl}/user/{idOrEmail}`);
    it('Should fail without an authenticated user', async () => {
      await spec().expectStatus(401);
    });
  });

  describe('/:idOrEmail (DELETE)', () => {
    const spec = () => pactum.spec().delete(`${baseUrl}/user/{idOrEmail}`);
    it('Should fail without an authenticated user', async () => {
      await spec().expectStatus(401);
    });
  });
});
