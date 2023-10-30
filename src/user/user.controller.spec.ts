import { createMock, PartialFuncReturn } from '@golevelup/ts-jest';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UserController } from './user.controller';
import { UserService } from './user.service';

const mockUser = new User();

const mockService = createMock<UserService>({
  findAll: () => Promise.resolve([mockUser]),
  findOne: () => Promise.resolve(mockUser),
  create: () => Promise.resolve(mockUser),
  update: () => Promise.resolve(mockUser),
  remove: () => Promise.resolve(),
  setPassword: () => Promise.resolve(true),
});

describe('UserController', () => {
  let controller: UserController;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it.todo('Should allow an Admin to list all users');
    it.todo('Should prevent unauthorized accounts from listing all users');
  });

  describe('findOne', () => {
    it.todo('Should allow an Admin to find any user');
    it.todo('Should prevent unauthorized accounts from finding a user');
  });
});
