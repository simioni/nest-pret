/* eslint-disable @typescript-eslint/no-empty-function */
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { Types } from 'mongoose';
import { UserRole } from '../user.constants';
import { User } from './user.schema';

const mockedUserId = new Types.ObjectId();
const mockUserBirthdaydate = new Date();
const plainUser = {
  _id: mockedUserId.toString(),
  email: 'someone@provider.com',
  password: '123412341234',
  name: 'Someone',
  birthdaydate: mockUserBirthdaydate,
  roles: [UserRole.USER],
  auth: {
    email: { valid: true },
  },
  __v: 1,
};
const instanceUser = new User({
  _id: mockedUserId,
  email: 'someone@provider.com',
  password: '123412341234',
  name: 'Someone',
  birthdaydate: mockUserBirthdaydate,
  roles: [UserRole.USER],
  auth: {
    email: { valid: true },
  },
  __v: 1,
});

describe('The User Model', () => {
  describe('When constructed from a plain object', () => {
    it('should carry all fields, including the password', () => {
      const result = new User(plainUser);
      expect(result._id).toEqual(new Types.ObjectId(plainUser._id));
      expect(result.name).toEqual(plainUser.name);
      expect(result.email).toEqual(plainUser.email);
      expect(result.password).toEqual(plainUser.password);
      expect(result.birthdaydate).toEqual(plainUser.birthdaydate);
    });
  });

  describe("When constructed with class-transformer's plainToInstance", () => {
    it('should carry all fields, including the password', () => {
      const result = plainToInstance(User, plainUser);
      expect(result._id).toEqual(new Types.ObjectId(plainUser._id));
      expect(result.name).toEqual(plainUser.name);
      expect(result.email).toEqual(plainUser.email);
      expect(result.password).toEqual(plainUser.password);
    });
  });

  describe('When constructed from a raw document from the DB', () => {
    it.todo('should carry all fields, including the password');
  });

  describe('When constructed from a document from the DB using .toObject()', () => {
    it.todo('should carry all fields, including the password');
  });

  describe('When constructed from a document from the DB using .toJSON()', () => {
    it.todo('should work, but should NOT include the password');
  });

  describe('When validated with class-validator', () => {});

  describe("When serialized with class-transformer's instanceToPlain", () => {
    let result;
    beforeAll(() => {
      result = instanceToPlain(instanceUser);
    });
    it('should NOT include the password', () => {
      expect(result.password).toBeUndefined();
    });
    it('should include _id as a string, not as ObjectID', () => {
      expect(result._id).toEqual(plainUser._id);
    });
    it('should include non-transformed fields just as they are', () => {
      expect(result.name).toEqual(plainUser.name);
      expect(result.email).toEqual(plainUser.email);
    });
    describe("When serialized for the user role 'Admin'", () => {
      it("Should include the properties 'roles', 'auth', 'birthdaydate', and '__v'", () => {
        const result = instanceToPlain(instanceUser, {
          groups: [UserRole.ADMIN],
        });
        expect(result.roles).toBeDefined();
        expect(result.auth).toEqual({ email: { valid: true } });
        expect(result.birthdaydate).toEqual(mockUserBirthdaydate);
        expect(result.__v).toEqual(1);
      });
    });
    describe("When serialized for the user role 'User'", () => {
      it("Should hide the properties 'roles', 'auth', 'birthdaydate', and '__v'", () => {
        const result = instanceToPlain(instanceUser, {
          groups: [UserRole.USER],
        });
        expect(result.roles).toBeUndefined();
        expect(result.auth).toBeUndefined();
        expect(result.birthdaydate).toBeUndefined();
        expect(result.__v).toBeUndefined();
      });
    });
  });

  describe('When serialized with JSON.stringify() - This is a failsafe to prevent data leaks in the event of a developer error ending up in production. Serialization should always be done by class-transformer', () => {
    let result;
    beforeAll(() => {
      result = JSON.parse(JSON.stringify(instanceUser));
    });
    it('should include _id as a string, not as ObjectID', () => {
      expect(result._id).toEqual(plainUser._id);
    });
    it('should NOT include the password property', () => {
      expect(result.password).toBeUndefined();
    });
    it('should include non-transformed fields just as they are', () => {
      expect(result.name).toEqual(plainUser.name);
      expect(result.email).toEqual(plainUser.email);
    });
    it('should hide all properties that have some serialization rule to them', () => {
      expect(result.roles).toBeUndefined();
      expect(result.auth).toBeUndefined();
      expect(result.birthdaydate).toBeUndefined();
      expect(result.__v).toBeUndefined();
    });
  });

  describe("When exposing it's instance methods", () => {
    it('isVerified() should return the email verification status', () => {
      const result = instanceUser.isVerified();
      expect(result).toEqual(true);
    });
  });

  describe('When serialized by the request pipeline', () => {
    describe('When an User class instance is returned from a route', () => {});
    describe('When an array of User class instances is returned from a route', () => {});
    describe('When a plain object with a nested User class instance is returned from a route', () => {});
  });
});

describe('The raw User document from the database', () => {
  describe('When transformed with .toObject()', () => {
    it.todo('should include the password property');
  });
  describe('When serialized with .toJSON()', () => {
    it.todo('should NOT include the password property');
  });
  describe('When serialized with JSON.stringify()', () => {
    it.todo('should NOT include the password property');
  });
});
