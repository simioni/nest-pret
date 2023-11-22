import { faker } from '@faker-js/faker';
import { INestApplication } from '@nestjs/common';
import * as pactum from 'pactum';
import { TestingServerFactory } from './config/testing-server.factory';
import { UserStubFactory } from './stubs/user-stub.factory';

describe('ThrottlerGuard (e2e)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let stub: UserStubFactory;

  beforeAll(async () => {
    // API_EMAIL_VERIFICATION=delayed allows loggin-in without verifing an email first.
    // This makes it easier to test for optional DTO fields.
    process.env.API_EMAIL_VERIFICATION = 'delayed';
    // decreases the throttler limit so tests take less time
    process.env.API_THROTTLE_LIMIT = '30';

    const testingServer = await new TestingServerFactory().create();
    app = testingServer.getApp();
    baseUrl = testingServer.getBaseUrl();
    stub = new UserStubFactory(testingServer);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });

  describe('The account creation rate limiter', () => {
    it('Should deny access to account creation if a single IP has created too many accounts in a short period', async () => {
      const spec = () => pactum.spec().post(`${baseUrl}/auth/email/register`);
      let reachedStatus429 = false;
      const createdUsers = [];
      async function* createAccGenerator() {
        let tries = 20;
        while (tries > 0) {
          tries--;
          const user = stub.createFakeUser();
          createdUsers.push(user);
          yield await spec()
            .withBody({
              email: user.email,
              password: '12345678',
            })
            .returns(({ res }) => {
              return res.statusCode;
            });
        }
      }
      for await (const statusCode of createAccGenerator()) {
        if (statusCode === 429) {
          reachedStatus429 = true;
          break;
        }
      }
      console.log(
        `Reached429? ${reachedStatus429} (after ${createdUsers.length} attempts)`,
      );
      expect(reachedStatus429).toEqual(true);
      await Promise.all(
        createdUsers.map((user) => stub.deleteUser(user.email)),
      );
    });
  });

  describe('The global rate limiter', () => {
    it('Should deny API access entirely if a single IP has made too many requests in a short period', async () => {
      const spec = () => pactum.spec().post(`${baseUrl}/auth/email/login`);
      let reachedStatus429 = false;
      let tries = 0;
      async function* makeRequestGenerator() {
        while (tries < 100) {
          tries++;
          yield await spec()
            .withBody({
              email: faker.internet.email(), // will 404 until 429
              password: '12345678',
            })
            .returns(({ res }) => {
              return res.statusCode;
            });
        }
      }
      for await (const statusCode of makeRequestGenerator()) {
        if (statusCode === 429) {
          reachedStatus429 = true;
          break;
        }
      }
      console.log(`Reached429? ${reachedStatus429} (after ${tries} attempts)`);
      expect(reachedStatus429).toEqual(true);
    });
  });
});
