import { instanceToPlain, plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, Model, Types } from 'mongoose';
import { UserRole } from '../user.constants';
import { User, UserSchema } from './user.schema';

const mockedUserId = new Types.ObjectId();
const mockUserbirthDate = new Date();
const plainUser = {
  _id: mockedUserId.toString(),
  email: 'someone@provider.com',
  password: '123412341234',
  name: 'Someone',
  birthDate: mockUserbirthDate,
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
  birthDate: mockUserbirthDate,
  roles: [UserRole.USER],
  auth: {
    email: { valid: true },
  },
  __v: 1,
});

describe('The User() Model', () => {
  describe('When constructed from a plain object', () => {
    it('should carry all fields, including the password', () => {
      const result = new User(plainUser);
      expect(result._id).toEqual(new Types.ObjectId(plainUser._id));
      expect(result.name).toEqual(plainUser.name);
      expect(result.email).toEqual(plainUser.email);
      expect(result.password).toEqual(plainUser.password);
      expect(result.birthDate).toEqual(plainUser.birthDate);
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

  describe('When validated with class-validator', () => {
    let errors;
    let intentionalErrors;
    beforeAll(() => {
      const validUserExample = plainToInstance(User, {
        ...plainUser,
        phone: 12341234,
        birthDate: new Date(),
      });
      errors = validateSync(validUserExample);
      const invalidUserExample = plainToInstance(User, {
        email: 'someone@providerDOTcom',
        birthDate: true,
      });
      intentionalErrors = validateSync(invalidUserExample);
    });
    it('should pass validation for an object that has the proper format', () => {
      expect(Array.isArray(errors)).toEqual(true);
      expect(errors.length).toEqual(0);
    });
    it('should fail validation for an improper email', () => {
      const error = intentionalErrors.find(
        (error) => error.property === 'email',
      );
      expect(error.constraints.isEmail).toBeDefined();
    });
    it('should fail validation for an improper password', () => {
      const error = intentionalErrors.find(
        (error) => error.property === 'password',
      );
      expect(error.constraints.minLength).toBeDefined();
    });
    it('should fail validation for an improper phone', () => {
      const error = intentionalErrors.find(
        (error) => error.property === 'phone',
      );
      expect(error.constraints.min).toBeDefined();
      expect(error.constraints.isInt).toBeDefined();
    });
    it('should fail validation for an improper birthDate', () => {
      const error = intentionalErrors.find(
        (error) => error.property === 'birthDate',
      );
      expect(error.constraints.isDate).toBeDefined();
    });
  });

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
      it("Should include the properties 'roles', 'auth', 'birthDate', and '__v'", () => {
        const result = instanceToPlain(instanceUser, {
          groups: [UserRole.ADMIN],
        });
        expect(result.roles).toBeDefined();
        expect(result.auth).toEqual({ email: { valid: true } });
        expect(result.birthDate).toEqual(mockUserbirthDate);
        expect(result.__v).toEqual(1);
      });
    });
    describe("When serialized for the user role 'User'", () => {
      it("Should hide the properties 'roles', 'auth', 'birthDate', and '__v'", () => {
        const result = instanceToPlain(instanceUser, {
          groups: [UserRole.USER],
        });
        expect(result.roles).toBeUndefined();
        expect(result.auth).toBeUndefined();
        expect(result.birthDate).toBeUndefined();
        expect(result.__v).toBeUndefined();
      });
    });
  });

  describe('When serialized with JSON.stringify() - even if this class is deeply nested inside other objects', () => {
    let result;
    beforeAll(() => {
      result = {
        about:
          'This is a wrapper object simulating a developer mistakenly wrapping a model in a POJO before sending it as route response',
        reason:
          'Random plain objects without types or serialization rules cannot be serialized by interceptors and are sent in responses as they are',
        failsafe:
          'Models will call instanceToPlain() on themselves inside their toJSON() method to prevent leaking unexposed properties',
        caveat:
          'Unlike the global RolesSerializerInterceptor, this call has NO access to user roles. Only properties exposed to ALL roles will be included here.',
        wrapper: {
          data: JSON.parse(JSON.stringify(instanceUser)),
        },
      };
    });
    it('should include _id as a string, not as ObjectID', () => {
      expect(result.wrapper.data._id).toEqual(plainUser._id);
    });
    it('should include non-transformed fields just as they are', () => {
      expect(result.wrapper.data.name).toEqual(plainUser.name);
      expect(result.wrapper.data.email).toEqual(plainUser.email);
    });
    it('should NOT include the password property', () => {
      expect(result.wrapper.data.password).toBeUndefined();
    });
    it('should NOT include any property that have some serialization rule to them', () => {
      expect(result.wrapper.data.roles).toBeUndefined();
      expect(result.wrapper.data.auth).toBeUndefined();
      expect(result.wrapper.data.birthDate).toBeUndefined();
      expect(result.wrapper.data.__v).toBeUndefined();
    });
  });

  describe("When exposing it's instance methods", () => {
    it('isVerified() should return the email verification status', () => {
      const result = instanceUser.isVerified();
      expect(result).toEqual(true);
    });
  });
});

describe('The User Document from the database', () => {
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let UserModel: Model<User>;
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;
    UserModel = mongoConnection.model(User.name, UserSchema);
    const doc = new UserModel(instanceUser);
    await doc.save();
  });
  afterAll(async () => {
    await mongoConnection.close();
    await mongod.stop();
  });

  describe('When used to construct a new User()', () => {
    describe('When the raw document is used', () => {
      it('Should succeed with the same result as calling .toObject(), since the User() constructor detects mongoose UserDocuments and automatically calls .toObject() on them', async () => {
        const doc = await UserModel.findOne({ email: instanceUser.email });
        const result = new User(doc);
        expect(result.password).toEqual(instanceUser.password);
        expect(result.email).toEqual(instanceUser.email);
        expect(result.phone).toEqual(instanceUser.phone);
        expect(result.birthDate).toEqual(instanceUser.birthDate);
        expect(result.roles).toEqual(instanceUser.roles);
        expect(result.auth).toEqual(instanceUser.auth);
      });
    });
    describe('When the document is manually cast using .toObject()', () => {
      it('Should succeed, and the resulting instance should carry all fields, including the password', async () => {
        const doc = await UserModel.findOne({ email: instanceUser.email });
        const result = new User(doc.toObject());
        expect(result.password).toEqual(instanceUser.password);
        expect(result.email).toEqual(instanceUser.email);
        expect(result.phone).toEqual(instanceUser.phone);
        expect(result.birthDate).toEqual(instanceUser.birthDate);
        expect(result.roles).toEqual(instanceUser.roles);
        expect(result.auth).toEqual(instanceUser.auth);
      });
    });
    describe("When a 'lean' document is used", () => {
      it('Should succeed with the same result as calling .toObject()', async () => {
        const doc = await UserModel.findOne({
          email: instanceUser.email,
        }).lean();
        const result = new User(doc);
        expect(result.password).toEqual(instanceUser.password);
        expect(result.email).toEqual(instanceUser.email);
        expect(result.phone).toEqual(instanceUser.phone);
        expect(result.birthDate).toEqual(instanceUser.birthDate);
        expect(result.roles).toEqual(instanceUser.roles);
        expect(result.auth).toEqual(instanceUser.auth);
      });
    });
    describe('When the document is cast using .toJSON()', () => {
      it("should succeed, but should NOT include the password since it's excluded from json", async () => {
        const doc = await UserModel.findOne({
          email: instanceUser.email,
        });
        const result = new User(doc.toJSON());
        expect(result.password).toBeUndefined();
        expect(result.name).toEqual(instanceUser.name);
        expect(result.email).toEqual(instanceUser.email);
        expect(result.phone).toEqual(instanceUser.phone);
        expect(result.birthDate).toEqual(instanceUser.birthDate);
        expect(result.roles).toEqual(instanceUser.roles);
        expect(result.auth).toEqual(instanceUser.auth);
      });
    });
  });

  describe("On it's .toObject() method", () => {
    it('should include the password property', async () => {
      const doc = await UserModel.findOne({ email: instanceUser.email });
      const result = doc.toObject();
      expect(result.password).toEqual(instanceUser.password);
    });
  });
  describe("On it's .toJSON() method", () => {
    it('should NOT include the password property', async () => {
      const doc = await UserModel.findOne({ email: instanceUser.email });
      const result = doc.toJSON();
      expect(result.password).toBeUndefined();
    });
  });
  describe('When passed to JSON.stringify()', () => {
    it('should NOT include the password property', async () => {
      const doc = await UserModel.findOne({ email: instanceUser.email });
      const result = JSON.parse(JSON.stringify(doc));
      expect(result.password).toBeUndefined();
    });
  });
});
