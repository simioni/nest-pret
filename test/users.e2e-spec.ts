import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as pactum from 'pactum';
import { UserService } from '../src/user/user.service';
import { TestingServerFactory } from './config/testing-server.factory';
import { FakeUser, UserStubFactory } from './stubs/user-stub.factory';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let mongooseConnection: Connection;
  let userService: UserService;
  let baseUrl: string;
  let stub: UserStubFactory;

  let verifiedUser: FakeUser;
  let adminUser: FakeUser;
  let verifiedUserToken: string;
  let adminUserToken: string;

  beforeAll(async () => {
    const testingServer = await new TestingServerFactory().create();
    const testingModule = testingServer.getModule();
    app = testingServer.getApp();
    baseUrl = testingServer.getBaseUrl();
    userService = await testingModule.resolve(UserService);
    mongooseConnection = await testingModule.resolve(getConnectionToken());
    await mongooseConnection.db.dropDatabase();

    stub = new UserStubFactory(testingServer);
    verifiedUser = await stub.registerNewVerifiedUser({ firstName: 'Martha' });
    adminUser = await stub.registerNewAdmin({ firstName: 'Charles' });
    verifiedUserToken = await stub.getLoginTokenForUser(verifiedUser);
    adminUserToken = await stub.getLoginTokenForUser(adminUser);
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
    it('Should fail for a user missing the LIST USER policy claim', async () => {
      await spec().withBearerToken(verifiedUserToken).expectStatus(403);
    });
    it('Should succeed for a user that have the LIST USER policy claim', async () => {
      await spec().withBearerToken(adminUserToken).expectStatus(200);
    });
  });

  describe('/ (POST)', () => {
    const spec = () => pactum.spec().post(`${baseUrl}/user`);
    let newUser;
    beforeAll(async () => {
      newUser = stub.createFakeUser({ firstName: 'Carol' });
    });
    afterAll(async () => {
      await stub.deleteUser(newUser.email);
    });
    it('Should fail without an authenticated user', async () => {
      await spec().withBody(newUser).expectStatus(401);
    });
    it('Should fail for a user missing the CREATE USER policy claim', async () => {
      await spec()
        .withBearerToken(verifiedUserToken)
        .withBody(newUser)
        .expectStatus(403);
    });
    it('Should succeed for a user that have the CREATE USER policy claim', async () => {
      await spec()
        .withBearerToken(adminUserToken)
        .withBody(newUser)
        .expectStatus(201)
        .expectJsonLike({ success: true, data: { email: newUser.email } });
    });
  });

  describe('/:idOrEmail (GET)', () => {
    const spec = () => pactum.spec().get(`${baseUrl}/user/{idOrEmail}`);
    it('Should fail without an authenticated user', async () => {
      await spec()
        .withPathParams('idOrEmail', verifiedUser.email)
        .expectStatus(401);
    });
    it('Should succeed for a user reading their own info', async () => {
      await spec()
        .withBearerToken(verifiedUserToken)
        .withPathParams('idOrEmail', verifiedUser.email)
        .expectStatus(200);
    });
    it('Should fail for a user reading someone elses info', async () => {
      await spec()
        .withBearerToken(verifiedUserToken)
        .withPathParams('idOrEmail', adminUser.email)
        .expectStatus(403);
    });
    it('Should succeed in reading someone else info IF the asking user has a blank READ USER policy claim', async () => {
      await spec()
        .withBearerToken(adminUserToken)
        .withPathParams('idOrEmail', verifiedUser.email)
        .expectStatus(200);
    });
  });

  describe('/:idOrEmail (PATCH)', () => {
    const spec = () => pactum.spec().patch(`${baseUrl}/user/{idOrEmail}`);
    it('Should fail without an authenticated user', async () => {
      await spec()
        .withPathParams('idOrEmail', verifiedUser.email)
        .expectStatus(401);
    });
    it('Should succeed for a user changing their own info', async () => {
      await spec()
        .withBearerToken(verifiedUserToken)
        .withPathParams('idOrEmail', verifiedUser.email)
        .withBody({ name: 'anotherName' })
        .expectStatus(200)
        .expectJsonLike({ success: true, data: { name: 'anotherName' } });
    });
    it('Should fail for a user trying to change someone elses info', async () => {
      await spec()
        .withBearerToken(verifiedUserToken)
        .withPathParams('idOrEmail', adminUser.email)
        .withBody({ name: 'anotherName' })
        .expectStatus(403);
    });
    it('Should succeed in changing someone else info IF the asking user has a blank UPDATE USER policy claim', async () => {
      await spec()
        .withBearerToken(adminUserToken)
        .withPathParams('idOrEmail', verifiedUser.email)
        .withBody({ name: 'changedName' })
        .expectStatus(200)
        .expectJsonLike({
          success: true,
          data: { email: verifiedUser.email, name: 'changedName' },
        });
    });
  });

  describe('/:idOrEmail (DELETE)', () => {
    const spec = () => pactum.spec().delete(`${baseUrl}/user/{idOrEmail}`);
    it('Should fail without an authenticated user', async () => {
      await spec()
        .withPathParams('idOrEmail', verifiedUser.email)
        .expectStatus(401);
    });
    it('Should fail for a user that does not have the DELETE USER policy claim', async () => {
      await spec()
        .withBearerToken(verifiedUserToken)
        .withPathParams('idOrEmail', verifiedUser.email)
        .expectStatus(403);
    });
    it('Should fail for a request missing the confirmation string', async () => {
      const validationError = await spec()
        .withBearerToken(adminUserToken)
        .withPathParams('idOrEmail', verifiedUser.email)
        .expectStatus(400)
        .returns('errors[0]');
      expect(validationError.field).toEqual('confirmationString');
      expect(validationError.errors.isEnum).toBeDefined();
    });
    it('Should fail for a request with the wrong confirmation string', async () => {
      const validationError = await spec()
        .withBearerToken(adminUserToken)
        .withPathParams('idOrEmail', verifiedUser.email)
        .withBody({ confirmationString: 'maybe delete?' })
        .expectStatus(400)
        .returns('errors[0]');
      expect(validationError.field).toEqual('confirmationString');
      expect(validationError.errors.isEnum).toBeDefined();
    });
    it('Should succeed if the user has a DELETE USER policy claim and has provided the correct confirmation string', async () => {
      await spec()
        .withBearerToken(adminUserToken)
        .withPathParams('idOrEmail', verifiedUser.email)
        .withBody({ confirmationString: 'DELETE USER' })
        .expectStatus(200);
    });
  });
});
