import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { hash } from 'bcryptjs';
import { isEmail } from 'class-validator';
import { Document, Model } from 'mongoose';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RegistrationValidationError } from './errors/registration-validation.error';
import { User, UserDocument } from './schemas/user.schema';
import { REGISTRATION_ERROR, USER_ERROR } from './user.constants';

const saltRounds = 10;

@Injectable()
export class UserService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<UserDocument>,
  ) {}

  async findAll({ limit = 100, offset = 0 }) {
    // TODO Add seek pagination instead of offset
    // https://www.moesif.com/blog/technical/api-design/REST-API-Design-Filtering-Sorting-and-Pagination/
    const users: UserDocument[] = await this.userModel
      .find()
      .limit(limit)
      .skip(offset)
      .exec();
    return users.map((user) => new User(user.toJSON()));
  }

  async findOne(
    idOrEmail: string,
    options: {
      // intended only for internal use by the auth module (a raw return includes passwords)
      returnRawMongooseObject?: boolean;
    } = {},
  ): Promise<User | UserDocument> {
    const query = isEmail(idOrEmail)
      ? { email: idOrEmail }
      : { _id: idOrEmail };
    const user = await this.userModel.findOne(query).exec();
    if (!user) throw new NotFoundException(USER_ERROR.USER_NOT_FOUND);
    if (options?.returnRawMongooseObject) return user;
    return new User(user.toJSON());
  }

  async create(newUserData: CreateUserDto): Promise<User> {
    const newUser = plainToInstance(CreateUserDto, newUserData);
    const errors = await validate(newUser);
    if (errors.length) {
      throw new RegistrationValidationError(errors);
    }
    const existingUser = await this.userModel
      .findOne({ email: newUser.email })
      .exec();
    if (existingUser) {
      throw new ConflictException(REGISTRATION_ERROR.EMAIL_ALREADY_REGISTERED);
    }
    newUser.password = await hash(newUser.password, saltRounds);
    const createdUser = new this.userModel(newUser);
    await createdUser.save();
    return new User(createdUser.toJSON());
  }

  async verifyEmail(email: string): Promise<boolean> {
    const user = await this.userModel.findOne({
      email: email,
    });
    if (!user) return false;
    user.set('auth.email.valid', true);
    await user.save();
    return true;
  }

  async setPassword(email: string, newPassword: string): Promise<boolean> {
    // if (!this.isStrongPassword(newPassword)) {
    //   throw new ForbiddenException(REGISTRATION_ERROR.PASSWORD_TOO_WEAK);
    // }
    const user = await this.userModel.findOne({ email: email }).exec();
    if (!user) {
      throw new NotFoundException(USER_ERROR.USER_NOT_FOUND);
    }
    user.password = await hash(newPassword, saltRounds);
    await user.save();
    return true;
  }

  async update(idOrEmail: string, updateUserDto: UpdateUserDto): Promise<User> {
    const query = isEmail(idOrEmail)
      ? { email: idOrEmail }
      : { _id: idOrEmail };
    const user = await this.userModel.findOne(query).exec();
    if (!user) {
      throw new NotFoundException(USER_ERROR.USER_NOT_FOUND);
    }
    user.set(updateUserDto);
    await user.save();
    return new User(user.toJSON());
  }

  async remove(idOrEmail: string): Promise<void> {
    const query = isEmail(idOrEmail)
      ? { email: idOrEmail }
      : { _id: idOrEmail };
    const user = await this.userModel.findOne(query).exec();
    if (!user) {
      throw new NotFoundException(USER_ERROR.USER_NOT_FOUND);
    }
    await this.userModel.deleteOne(query).exec();
    // return true;
  }
}
