import { INestApplication } from '@nestjs/common';
import * as pactum from 'pactum';
import { UserAuth } from 'src/user/schemas/user-auth.schema';
import { User } from 'src/user/schemas/user.schema';
import { UserRole } from 'src/user/user.constants';
import { TestingServerFactory } from './config/testing-server.factory';
import { FakeUser, UserStubFactory } from './stubs/user-stub.factory';

describe('App (e2e)', () => {
  let app: INestApplication;
  // let authService: AuthService;
  // let userService: UserService;
  // let getEmailVerificationTokenFor: (email: string) => Promise<string>;
  // let emailVerificationModel: Model<EmailVerificationDocument>;
  // let forgottenPasswordModel: Model<ForgottenPasswordDocument>;
  let baseUrl: string;
  let verifiedUser: FakeUser;
  let adminUser: FakeUser;
  let verifiedUserToken: string;
  let adminUserToken: string;
  let stub: UserStubFactory;

  beforeAll(async () => {
    const testingServer = await new TestingServerFactory().create();
    // const testingModule = testingServer.getModule();
    app = testingServer.getApp();
    baseUrl = testingServer.getBaseUrl();
    // userService = await testingModule.resolve(UserService);
    // authService = await testingModule.resolve(AuthService);
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
    stub = new UserStubFactory(testingServer);
    verifiedUser = await stub.registerNewVerifiedUser({ firstName: 'Thabata' });
    adminUser = await stub.registerNewAdmin({ firstName: 'Oliver' });

    verifiedUserToken = await stub.getLoginTokenForUser(verifiedUser);
    adminUserToken = await stub.getLoginTokenForUser(adminUser);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
    // expect(userService).toBeDefined();
    // expect(authService).toBeDefined();
  });

  describe('The global ValidationPipe', () => {
    it.todo(
      'Should throw an exception if a request is missing some property required by the expected DTO',
    );
    it.todo(
      'Should throw an exception if a request contains extra properties unknown to the expected DTO',
    );
    it.todo('Should accept properties that are optional on the expected DTO');
    it.todo(
      'Should not complain if optional properties of the expected DTO are missing from the request',
    );
  });

  describe('The global RoleSerializerInterceptor', () => {
    const spec = () => pactum.spec().get(`${baseUrl}/user/{idOrEmail}`);
    describe("When serializing objects for users with role 'USER'", () => {
      let data: Partial<User>;
      beforeAll(async () => {
        data = await spec()
          .withBearerToken(verifiedUserToken)
          .withPathParams('idOrEmail', verifiedUser.email)
          .expectStatus(200)
          .inspect()
          .returns('data');
      });
      it('Should include model properties that the User role has access to', async () => {
        expect(data.name).toEqual(verifiedUser.name);
        expect(data.email).toEqual(verifiedUser.email);
      });
      it('Should exclude model properties that the User role has NO access to', async () => {
        expect(data.auth).toBeUndefined();
        expect(data.roles).toBeUndefined();
      });
      it('Should exclude model properties that no one has access to (property with blank @Exclude() decorator)', async () => {
        expect(data.password).toBeUndefined();
      });
    });
    describe("When serializing objects for users with role 'ADMIN'", () => {
      let data: Partial<User>;
      beforeAll(async () => {
        data = await spec()
          .withBearerToken(adminUserToken)
          .withPathParams('idOrEmail', verifiedUser.email)
          .expectStatus(200)
          .returns('data');
      });
      it('Should include model properties that everyone has access to', async () => {
        expect(data.name).toEqual(verifiedUser.name);
        expect(data.email).toEqual(verifiedUser.email);
      });
      it('Should include model properties that the Admin role has access to', async () => {
        expect(data.auth).toEqual<UserAuth>({ email: { valid: true } });
        expect(data.roles).toEqual([UserRole.USER]);
      });
      it('Should exclude model properties that no one has access to (property with blank @Exclude() decorator)', async () => {
        expect(data.password).toBeUndefined();
      });
    });
  });

  describe('The global rate limiter ThrottlerGuard', () => {
    it.todo(
      'Should deny access to account creation if a single IP has created too many accounts in a short period',
    );
    it.todo(
      'Should deny API access entirely if a single IP has made too many requests in a short period',
    );
  });
});
