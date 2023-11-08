import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as pactum from 'pactum';
import { UserService } from '../src/user/user.service';
import { TestingServer } from './config/setup-test-server';
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
    const testingServer = await new TestingServer().create();
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
    // login user
    it('Should fail for a user missing the LIST policy claim', async () => {
      await spec().withBearerToken(verifiedUserToken).expectStatus(403);
    });
    // login admin
    it('Should succeed for a user that have the LIST policy claim', async () => {
      await spec().withBearerToken(adminUserToken).expectStatus(200).inspect();
    });
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
