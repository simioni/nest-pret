import { createMock } from '@golevelup/ts-jest';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, Model, Types } from 'mongoose';
import { AuthModule } from 'src/auth/auth.module';
import {
  CaslAbilityFactory,
  UserAbility,
} from 'src/policies/casl-ability.factory';
import { PoliciesModule } from 'src/policies/policies.module';
import * as supertest from 'supertest';
import { ConfigService } from '@nestjs/config';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import {
  EmailVerification,
  EmailVerificationSchema,
} from 'src/auth/schemas/email-verification.schema';
import { MailerService } from 'src/mailer/mailer.service';
import { User, UserDocument, UserSchema } from './schemas/user.schema';
import { UserRole } from './user.constants';
import { UserController } from './user.controller';
import { UserService } from './user.service';

const mockUser = new User({
  _id: new Types.ObjectId(),
  email: 'someone@provider.com',
  name: 'Someone',
  roles: [UserRole.USER],
  auth: {
    email: { valid: true },
  },
});

const mockService = createMock<UserService>({
  findAll: () => Promise.resolve([mockUser]),
  findOne: () => Promise.resolve(mockUser),
  create: () => Promise.resolve(mockUser),
  update: () => Promise.resolve(mockUser),
  remove: () => Promise.resolve(),
  setPassword: () => Promise.resolve(true),
});

describe('UserController', () => {
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let request: supertest.SuperTest<supertest.Test>;
  let app: INestApplication;
  let userController: UserController;
  let userAbility: UserAbility;
  let userModel: Model<User>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;
    userModel = mongoConnection.model(User.name, UserSchema);
    const emailVerificationModel = mongoConnection.model(
      EmailVerification.name,
      EmailVerificationSchema,
    );
    const module: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(uri), AuthModule, PoliciesModule],
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: mockService },
        { provide: getModelToken(User.name), useValue: userModel },
        {
          provide: getModelToken(EmailVerification.name),
          useValue: emailVerificationModel,
        },
      ],
    })
      .overrideProvider(MailerService)
      .useValue({
        sendEmailVerification: () => true,
        sendEmailForgotPassword: () => true,
      })
      .overrideProvider(ConfigService)
      .useValue({
        get: (configName) => {
          if (configName === 'jwt') return { secret: '123456789' };
          if (configName === 'api')
            return { emailVerificationIsOn: () => false };
        },
      })
      .compile();

    app = module.createNestApplication();
    await app.init();

    request = supertest(app.getHttpServer());

    userAbility = new CaslAbilityFactory().createForUser(
      mockUser as UserDocument,
    );
    userController = module.get<UserController>(UserController);
  });

  afterAll(async () => {
    await mongoConnection.close();
    await mongod.stop();
    await app.close();
  });

  it('should be defined', () => {
    expect(userController).toBeDefined();
    expect(request).toBeDefined();
  });

  describe('findAll', () => {
    it.todo('Should allow an Admin to list all users');
    it.todo('Should prevent unauthorized accounts from listing all users');
  });

  describe('findOne', () => {
    it('should find one', async () => {
      // const userResponse = await userController.findOne(
      //   'someone@gmail.com',
      //   userAbility,
      // );
      // console.log(userResponse);
      const superResponse = await request
        .get(`/user/${mockUser.email}`)
        .expect(404);
      console.log(superResponse.body);
    });
    it.todo('Should allow an Admin to find any user');
    it.todo('Should prevent unauthorized accounts from finding a user');
  });
});
