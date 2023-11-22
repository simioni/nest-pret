import { INestApplication } from '@nestjs/common';
import * as pactum from 'pactum';
import { VALIDATION_ERROR } from 'src/app.constants';
import { UserAuth } from 'src/user/schemas/user-auth.schema';
import { User } from 'src/user/schemas/user.schema';
import { UserRole } from 'src/user/user.constants';
import { TestingServerFactory } from './config/testing-server.factory';
import { FakeUser, UserStubFactory } from './stubs/user-stub.factory';

describe('App (e2e)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let verifiedUser: FakeUser;
  let adminUser: FakeUser;
  let verifiedUserToken: string;
  let adminUserToken: string;
  let stub: UserStubFactory;

  beforeAll(async () => {
    // API_EMAIL_VERIFICATION=delayed allows loggin-in without verifing an email first.
    // This makes it easier to test for optional DTO fields.
    process.env.API_EMAIL_VERIFICATION = 'delayed';

    const testingServer = await new TestingServerFactory().create();
    // const testingModule = testingServer.getModule();
    app = testingServer.getApp();
    baseUrl = testingServer.getBaseUrl();

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
  });

  describe('The global ValidationPipe', () => {
    const spec = () => pactum.spec().post(`${baseUrl}/auth/email/register`);

    it('Should throw an exception if a request is missing some REQUIRED property from the DTO', async () => {
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

    it('Should throw an exception if a request contains extra properties UNKNOWN to the expected DTO', async () => {
      const user = stub.createFakeUser({ firstName: 'Martin' });
      const res = await spec()
        .withBody({
          email: user.email,
          password: '12345678',
          extraProperty: 'Should Not Be Here',
        })
        .expectStatus(400)
        .toss();
      expect(res.body.message).toEqual(VALIDATION_ERROR.ERROR);
      expect(Array.isArray(res.body.errors)).toEqual(true);
      expect(
        res.body.errors.find((elem) => elem.field === 'extraProperty').errors
          .whitelistValidation,
      ).toBeDefined();
      await stub.deleteUser(user.email);
    });

    it('Should accept properties that are OPTIONAL on the expected DTO', async () => {
      const user = stub.createFakeUser({
        firstName: 'Jason',
        includeNameInReturn: true,
      });
      const body = await spec()
        .withBody({
          name: user.name,
          familyName: 'Mayer',
          phone: 1234567,
          birthDate: new Date().toISOString(),
          email: user.email,
          password: '12345678',
        })
        .expectStatus(201)
        .returns((ctx) => ctx.res.body);
      expect(body.success).toEqual(true);
      expect(body.data.user.name).toEqual(user.name);
      expect(body.data.user.familyName).toEqual('Mayer');
      expect(body.data.user.email).toEqual(user.email);
      expect(body.data.user.phone).toEqual('1234567');
      // use an admin account to verify that the birthDate was created (since that field is only visible to admins)
      const createdUser: User = await pactum
        .spec()
        .get(`${baseUrl}/user/{idOrEmail}`)
        .withBearerToken(adminUserToken)
        .withPathParams('idOrEmail', user.email)
        .expectStatus(200)
        .returns(({ res }) => res.body.data);
      expect(createdUser.birthDate).toBeDefined();
      await stub.deleteUser(user.email);
    });

    it('Should validate OPTIONAL properties if they are present', async () => {
      const user = stub.createFakeUser({
        firstName: 'Lily',
        includeNameInReturn: true,
      });
      const result = await spec()
        .withBody({
          phone: '1234',
          birthDate: 999,
          email: user.email,
          password: '12345678',
        })
        .expectStatus(400)
        .toss();
      const findError = (property) =>
        result.body.errors.find((elem) => elem.field === property);
      expect(findError('phone').errors.min).toBeDefined();
      expect(findError('phone').errors.isInt).toBeDefined();
      expect(findError('birthDate').errors.isDate).toBeDefined();
      await stub.deleteUser(user.email);
    });

    it('Should not complain if OPTIONAL properties are missing entirely', async () => {
      const user = stub.createFakeUser({ firstName: 'Luna' });
      const res = await spec()
        .withBody({
          email: user.email,
          password: '12345678',
        })
        .expectStatus(201)
        .toss();
      expect(res.body.success).toEqual(true);
      expect(res.body.data.user.email).toEqual(user.email);
      await stub.deleteUser(user.email);
    });
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
