import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { hash } from 'bcryptjs';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './schemas/user.schema';
import { REGISTRATION_ERROR, USER_ERROR } from './user.constants';

const saltRounds = 10;

@Injectable()
export class UserService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<UserDocument>,
  ) {}

  async findAll() {
    const users: UserDocument[] = await this.userModel.find().exec();
    return users.map((user) => new User(user.toJSON()));
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userModel.findOne({ email: email }).exec();
    if (!user) {
      throw new NotFoundException(USER_ERROR.USER_NOT_FOUND);
    }
    return new User(user.toJSON());
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(USER_ERROR.USER_NOT_FOUND);
    }
    return new User(user.toJSON());
  }

  async createNewUser(newUser: CreateUserDto): Promise<User> {
    if (
      !this.isValidEmail(newUser.email) ||
      typeof newUser.password !== 'string'
    ) {
      throw new ForbiddenException(
        REGISTRATION_ERROR.MISSING_MANDATORY_PARAMETERS,
      );
    }
    if (!this.isStrongPassword(newUser.password)) {
      throw new ForbiddenException(REGISTRATION_ERROR.PASSWORD_TOO_WEAK);
    }

    const existingUser = await this.userModel
      .findOne({ email: newUser.email })
      .exec();
    // if (existingUser?.auth?.email?.valid) {
    if (existingUser) {
      throw new ForbiddenException(REGISTRATION_ERROR.EMAIL_ALREADY_REGISTERED);
    }
    // if (existingUser) {
    //   return new User(existingUser.toJSON()); // already exists but has unverified email
    // }

    newUser.password = await hash(newUser.password, saltRounds);
    const createdUser = new this.userModel(newUser);
    await createdUser.save();

    return new User(createdUser.toJSON());
  }

  isValidEmail(email: string) {
    if (!email) return false;
    const regex =
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return regex.test(email);
  }

  isStrongPassword(password: string) {
    return typeof password === 'string' && password.length >= 8;
  }

  async setPassword(email: string, newPassword: string): Promise<boolean> {
    if (!this.isStrongPassword(newPassword)) {
      throw new ForbiddenException(REGISTRATION_ERROR.PASSWORD_TOO_WEAK);
    }
    const user = await this.userModel.findOne({ email: email }).exec();
    if (!user) {
      throw new NotFoundException(USER_ERROR.USER_NOT_FOUND);
    }
    user.password = await hash(newPassword, saltRounds);
    await user.save();
    return true;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
