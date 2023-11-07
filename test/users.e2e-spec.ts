import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as pactum from 'pactum';
import { UserService } from '../src/user/user.service';
import { TestingServer } from './config/setup-test-server';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let mongooseConnection: Connection;
  let userService: UserService;
  let baseUrl: string;

  beforeAll(async () => {
    const testingServer = await new TestingServer().create();
    const testingModule = testingServer.getModule();
    app = testingServer.getApp();
    baseUrl = testingServer.getBaseUrl();
    userService = await testingModule.resolve(UserService);
    mongooseConnection = await testingModule.resolve(getConnectionToken());
    await mongooseConnection.db.dropDatabase();
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
