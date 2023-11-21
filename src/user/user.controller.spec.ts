import { createMock } from '@golevelup/ts-jest';
import {
  CallHandler,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { StandardResponseInterceptor } from 'nest-standard-response';
import { lastValueFrom, of } from 'rxjs';
import { MailerService } from 'src/mailer/mailer.service';
import {
  CaslAbilityFactory,
  UserAbility,
} from 'src/policies/casl-ability.factory';
import { PoliciesModule } from 'src/policies/policies.module';
import { User, UserDocument } from './schemas/user.schema';
import { UserRole } from './user.constants';
import { UserController } from './user.controller';
import { UserService } from './user.service';

const mockedUserId = new Types.ObjectId();
const mockUser = new User({
  _id: mockedUserId,
  email: 'someone@provider.com',
  password: '123412341234',
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
  let app: INestApplication;
  let userAbility: UserAbility;
  let userController: UserController;

  let interceptor: StandardResponseInterceptor;
  let reflector: Reflector;
  let context: ExecutionContext;
  let handler: CallHandler;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PoliciesModule],
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockService }],
    })
      .overrideProvider(MailerService)
      .useValue({
        sendEmailVerification: () => true,
        sendEmailForgotPassword: () => true,
      })
      .compile();

    app = module.createNestApplication();
    await app.init();

    reflector = new Reflector();
    context = createMock<ExecutionContext>();
    interceptor = new StandardResponseInterceptor(reflector);

    userAbility = new CaslAbilityFactory().createForUser(
      mockUser as UserDocument,
    );
    userController = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(userController).toBeDefined();
    // expect(request).toBeDefined();
  });

  describe('findAll', () => {
    // it.todo('Should allow an Admin to list all users');
    // it.todo('Should prevent unauthorized accounts from listing all users');
  });

  describe('findOne', () => {
    it('should find one', async () => {
      //
    });
  });

  describe('findOne', () => {
    it('should find one user', async () => {
      const userResponse = await userController.findOne(
        'someone@gmail.com',
        userAbility,
      );

      handler = createMock<CallHandler>({
        handle: () => of(userResponse),
      });
      const userObservable = interceptor.intercept(context, handler);
      const response = await lastValueFrom(userObservable);
      // console.log(response);
      expect(response.success).toEqual(true);
      expect(response.data.name).toEqual(mockUser.name);
      // const superResponse = await request.get(`/user/${mockUser.email}`);
      // console.log(superResponse.body);
    });
    describe('when a user is found', () => {
      it('The User model should always hide the password field when converted to JSON ', () => {
        // expect(response.body.name).toEqual(mockUser.name);
        // expect(response.body.password).toBeUndefined();
      });
      it('The User model should always hide the password field when converted to JSON ', () => {
        // expect(response.body.name).toEqual(mockUser.name);
        // expect(response.body.password).toBeUndefined();
      });
    });
    // it.todo('Should allow an Admin to find any user');
    // it.todo('Should prevent unauthorized accounts from finding a user');
  });
});
