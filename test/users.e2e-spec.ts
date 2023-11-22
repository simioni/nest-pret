import { INestApplication } from '@nestjs/common';
import * as pactum from 'pactum';
import { User } from 'src/user/schemas/user.schema';
import {
  EMAIL_VERIFICATION_ERROR,
  UserRole,
  USER_ERROR,
} from 'src/user/user.constants';
import { TestingServerFactory } from './config/testing-server.factory';
import { FakeUser, UserStubFactory } from './stubs/user-stub.factory';

describe('UserController (e2e)', () => {
  let app: INestApplication;

  let baseUrl: string;
  let stub: UserStubFactory;

  let unverifiedUser: FakeUser;
  let verifiedUser: FakeUser;
  let adminUser: FakeUser;
  let unverifiedUserToken: string;
  let verifiedUserToken: string;
  let adminUserToken: string;

  beforeAll(async () => {
    // API_EMAIL_VERIFICATION=delayed allows loggin-in without verifing an email first.
    // This makes it possible to test the EmailVerifiedGuard.
    process.env.API_EMAIL_VERIFICATION = 'delayed';
    // increases the throttler account creation limit
    process.env.API_THROTTLE_LIMIT_ACCOUNTS = '20';

    const testingServer = await new TestingServerFactory().create();
    // const testingModule = testingServer.getModule();
    app = testingServer.getApp();
    baseUrl = testingServer.getBaseUrl();

    stub = new UserStubFactory(testingServer);
    unverifiedUser = await stub.registerNewUser({ firstName: 'Debra' });
    verifiedUser = await stub.registerNewVerifiedUser({ firstName: 'Martha' });
    adminUser = await stub.registerNewAdmin({ firstName: 'Charles' });

    unverifiedUserToken = await stub.getLoginTokenForUser(unverifiedUser);
    verifiedUserToken = await stub.getLoginTokenForUser(verifiedUser);
    adminUserToken = await stub.getLoginTokenForUser(adminUser);
  });

  afterAll(async () => {
    await stub.deleteUser(unverifiedUser.email);
    await stub.deleteUser(verifiedUser.email);
    await stub.deleteUser(adminUser.email);
    await app.close();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
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
    it("Should fail for a logged-in user without a verified email (due to 'delayed' email verification config + EmailVerifiedGuard)", async () => {
      await spec()
        .withBearerToken(unverifiedUserToken)
        .expectStatus(403)
        .expectJsonLike({
          message: EMAIL_VERIFICATION_ERROR.VERIFY_EMAIL_TO_PROCEED,
        });
    });
    it('Should fail without a valid id or email', async () => {
      await spec()
        .withBearerToken(adminUserToken)
        .withPathParams('idOrEmail', '1234')
        .expectStatus(400)
        .expectJsonLike({ message: USER_ERROR.INVALID_EMAIL_OR_ID });
    });
    it('Should fail for a valid but inexistent email', async () => {
      await spec()
        .withBearerToken(adminUserToken)
        .withPathParams('idOrEmail', 'valid_email@butunregistered.com')
        .expectStatus(404)
        .expectJsonLike({ message: USER_ERROR.USER_NOT_FOUND });
    });
    it('Should fail for a valid but inexistent id', async () => {
      await spec()
        .withBearerToken(adminUserToken)
        .withPathParams('idOrEmail', '654cd95d2fb58b119d91d190')
        .expectStatus(404)
        .expectJsonLike({ message: USER_ERROR.USER_NOT_FOUND });
    });
    it('Should fail for a user reading someone elses info', async () => {
      await spec()
        .withBearerToken(verifiedUserToken)
        .withPathParams('idOrEmail', adminUser.email)
        .expectStatus(403);
    });
    describe('Should succeed for a user reading their own info', () => {
      let user: User;
      it('...and return the user object properties that a User has access to', async () => {
        user = await spec()
          .withBearerToken(verifiedUserToken)
          .withPathParams('idOrEmail', verifiedUser.email)
          .expectStatus(200)
          .expectJsonLike({
            success: true,
            data: {
              email: verifiedUser.email,
            },
          })
          .returns(({ res }) => res.body.data);
      });
      it('while hiding other properties', () => {
        expect(user.password).toBeUndefined();
        expect(user.roles).toBeUndefined();
        expect(user.auth).toBeUndefined();
      });
    });
    describe('Should succeed in reading someone else info IF the asking user has a blank READ USER policy claim', () => {
      let user: User;
      it('...and return the user object properties that an Admin has access to', async () => {
        user = await spec()
          .withBearerToken(adminUserToken)
          .withPathParams('idOrEmail', verifiedUser.email)
          .expectStatus(200)
          .expectJsonLike({
            success: true,
            data: {
              email: verifiedUser.email,
              roles: [UserRole.USER],
              auth: {
                email: {
                  valid: true,
                },
              },
            },
          })
          .returns(({ res }) => res.body.data);
      });
      it('while hiding other properties', async () => {
        expect(user.password).toBeUndefined();
      });
    });
  });

  describe('/:idOrEmail (PATCH)', () => {
    const spec = () => pactum.spec().patch(`${baseUrl}/user/{idOrEmail}`);
    it('Should fail without an authenticated user', async () => {
      await spec()
        .withPathParams('idOrEmail', verifiedUser.email)
        .expectStatus(401);
    });
    it("Should fail for a logged-in user without a verified email (due to 'delayed' email verification config + EmailVerifiedGuard)", async () => {
      await spec()
        .withBearerToken(unverifiedUserToken)
        .expectStatus(403)
        .expectJsonLike({
          message: EMAIL_VERIFICATION_ERROR.VERIFY_EMAIL_TO_PROCEED,
        });
    });
    it('Should fail without a valid id or email', async () => {
      await spec()
        .withBearerToken(adminUserToken)
        .withPathParams('idOrEmail', '1234')
        .expectStatus(400)
        .expectJsonLike({ message: USER_ERROR.INVALID_EMAIL_OR_ID });
    });
    it('Should fail for a valid but inexistent email', async () => {
      await spec()
        .withBearerToken(adminUserToken)
        .withPathParams('idOrEmail', 'valid_email@butunregistered.com')
        .expectStatus(404)
        .expectJsonLike({ message: USER_ERROR.USER_NOT_FOUND });
    });
    it('Should fail for a valid but inexistent id', async () => {
      await spec()
        .withBearerToken(adminUserToken)
        .withPathParams('idOrEmail', '654cd95d2fb58b119d91d190')
        .expectStatus(404)
        .expectJsonLike({ message: USER_ERROR.USER_NOT_FOUND });
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
    it('Should fail without a valid id or email', async () => {
      await spec()
        .withBearerToken(adminUserToken)
        .withPathParams('idOrEmail', '1234')
        .expectStatus(400)
        .expectJsonLike({ message: USER_ERROR.INVALID_EMAIL_OR_ID });
    });
    it('Should fail for a valid but inexistent email', async () => {
      await spec()
        .withBearerToken(adminUserToken)
        .withPathParams('idOrEmail', 'valid_email@butunregistered.com')
        .withBody({ confirmationString: 'DELETE USER' })
        .expectStatus(404)
        .expectJsonLike({ message: USER_ERROR.USER_NOT_FOUND });
    });
    it('Should fail for a valid but inexistent id', async () => {
      await spec()
        .withBearerToken(adminUserToken)
        .withPathParams('idOrEmail', '654cd95d2fb58b119d91d190')
        .withBody({ confirmationString: 'DELETE USER' })
        .expectStatus(404)
        .expectJsonLike({ message: USER_ERROR.USER_NOT_FOUND });
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
