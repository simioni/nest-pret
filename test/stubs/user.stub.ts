import { faker } from '@faker-js/faker';

export type FakeUser = {
  email: string;
  password: string;
};

export type FakeUserOptions = {
  firstName?: string;
  lastName?: string;
  provider?: string;
  allowSpecialCharacters?: boolean;
};

export function createFakeUser(options?: FakeUserOptions): FakeUser {
  return {
    email: faker.internet.email(options),
    password: faker.internet.password({ length: 8 }),
  };
}
