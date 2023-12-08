import { createMock } from '@golevelup/ts-jest';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import { PoliciesModule } from 'src/policies/policies.module';
import { User, UserDocument } from './schemas/user.schema';
import { UserController } from './user.controller';
import { UserService } from './user.service';

// TODO maybe consider using mogodb-memory-server?
// https://betterprogramming.pub/testing-controllers-in-nestjs-and-mongo-with-jest-63e1b208503c

// const mockedUser = new User({ _id: new Types.ObjectId() });
const mockUserDocument = createMock<UserDocument>({
  _id: new Types.ObjectId(),
  name: 'Matt',
  email: 'matt@ismocked.com',
  save: async function () {
    return Promise.resolve(this);
  },
  toJSON: function () {
    // return JSON.stringify(this);
    return this;
  },
});

describe('UserService', () => {
  let controller: UserController;
  let service: UserService;
  // let mockUserModel: Model<UserDocument>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PoliciesModule],
      controllers: [UserController],
      providers: [
        UserService,
        {
          provide: getModelToken(User.name),
          useValue: createMock<Model<UserDocument>>({
            findOne: () => ({
              exec: async () => mockUserDocument,
            }),
          }),
          // useValue: Model, // <-- Use the Model Class from Mongoose
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
    // mockUserModel = module.get<Model<UserDocument>>(getModelToken(User.name));
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    // expect(mockUserModel).toBeDefined();
  });

  it('should return a user doc', async () => {
    // const result = await service.findOne('someFakeId');
    // expect(result).toBeDefined();
    // expect(result.name).toEqual('Matt');
  });
});
