import { faker } from '@faker-js/faker';
import { getConnectionToken } from '@nestjs/mongoose';
import { TestingModule } from '@nestjs/testing';
import { Connection } from 'mongoose';
import * as pactum from 'pactum';
import { TestingServerFactory } from 'test/config/testing-server.factory';

export type FakeUser = {
  email: string;
  password: string;
  name?: string;
};

export type FakeUserOptions = {
  firstName?: string;
  lastName?: string;
  provider?: string;
  allowSpecialCharacters?: boolean;
};

export class UserStubFactory {
  private testingServer: TestingServerFactory;
  private testingModule: TestingModule;
  private baseUrl: string;

  constructor(testingServer: TestingServerFactory) {
    this.testingServer = testingServer;
    this.testingModule = testingServer.getModule();
    this.baseUrl = this.testingServer.getBaseUrl();
  }

  public createFakeUser(options?: FakeUserOptions): FakeUser {
    // const name = options.firstName || faker.person.firstName();
    return {
      // name: name,
      email: faker.internet.email(options),
      // email: faker.internet.email({ ...options, firstName: name }),
      password: faker.internet.password({ length: 8 }),
    };
  }

  public async registerNewUser(options?: FakeUserOptions) {
    const stubUser = this.createFakeUser(options);
    await pactum
      .spec()
      .post(`${this.baseUrl}/auth/email/register`)
      .withRequestTimeout(6000)
      .withBody(stubUser)
      .expectStatus(201);
    return stubUser;
  }

  public async registerNewVerifiedUser(options?: FakeUserOptions) {
    const registeredUser = await this.registerNewUser(options);
    const mongooseConnection = await this.testingModule.resolve<Connection>(
      getConnectionToken(),
    );
    await mongooseConnection.db
      .collection('users')
      .findOneAndUpdate(
        { email: registeredUser.email },
        { $set: { ['auth.email.valid']: true } },
        { upsert: true, returnDocument: 'after' },
      );
    return registeredUser;
  }

  public async registerNewAdmin(options?: FakeUserOptions) {
    const registeredUser = await this.registerNewVerifiedUser(options);
    const mongooseConnection = await this.testingModule.resolve<Connection>(
      getConnectionToken(),
    );
    await mongooseConnection.db
      .collection('users')
      .findOneAndUpdate(
        { email: registeredUser.email },
        { $set: { roles: ['Admin'] } },
        { upsert: true, returnDocument: 'after' },
      );
    return registeredUser;
  }

  public async deleteUser(email: string) {
    const mongooseConnection = await this.testingModule.resolve<Connection>(
      getConnectionToken(),
    );
    await mongooseConnection.db
      .collection('users')
      .findOneAndDelete({ email: email });
  }

  public async getLoginTokenForUser(user) {
    // await userService.verifyEmail(registeredUser.email);
    const token = await pactum
      .spec()
      .post(`${this.baseUrl}/auth/email/login`)
      .withBody(user)
      .expectStatus(201)
      .returns('data.token.accessToken');
    return token;
  }
}
