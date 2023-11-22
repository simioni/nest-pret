// import { Photo } from 'common/schemas/photo.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import {
  Exclude,
  Expose,
  instanceToPlain,
  Transform,
  TransformationType,
} from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsInt,
  isISO8601,
  Min,
  MinLength,
} from 'class-validator';
import { HydratedDocument, Model, Types } from 'mongoose';
import { UserRole } from '../user.constants';
import { UserAuth } from './user-auth.schema';
import { UserPhotos } from './user-photos.schema';
import { UserSettings } from './user-settings.schema';
export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  toJSON: {
    transform: function (doc: UserDocument, ret: Record<string, any>) {
      delete ret.password;
      return ret;
    },
  },
})
export class User {
  @ApiProperty({ type: 'string' })
  @Transform(({ value }) => value.toString(), { toPlainOnly: true })
  @Transform(({ value }) => new Types.ObjectId(value), { toClassOnly: true })
  _id: Types.ObjectId; // _id should NOT be declared explicitly to mongoose (skip the @Prop() decorator)

  @Prop()
  @ApiProperty({ required: true, example: 'PASSWORD' })
  @MinLength(8)
  @Exclude({ toPlainOnly: true }) // exclude only when serializing (classToPlain), but keep when creating a new User from a POJO (plainToClass)
  password?: string; // this property is optional because UserService will skip it from being returned unless it's explicitly asked for it with { includePassword: true }

  @Prop({ index: { unique: true } })
  @ApiProperty({ example: 'markhiggens3310@gmail.com' })
  @IsEmail()
  email: string;

  @Prop()
  @ApiProperty({ example: 'Mark' })
  name: string;

  @Prop()
  @ApiProperty({ example: 'Higgens' })
  familyName?: string;

  @Prop()
  @ApiProperty({ example: '093478857' })
  @IsInt()
  @Min(100000, { message: 'phone must have at least 6 digits' })
  phone?: string;

  @Prop()
  @ApiProperty({ type: 'string', example: '07-23-1992' }) // birthDate is exposed as string in the API
  @Transform(({ value, type, options }) => {
    if (type === TransformationType.PLAIN_TO_CLASS)
      return isISO8601(value) ? new Date(value) : value; // but transformed during plainToClass, into a proper Date() but only if the string is a valid ISO 8601 date string
    if (options.groups?.includes(UserRole.ADMIN)) return value; // also allowed during classToPlain (serialization), but only for ADMINs
    return undefined;
  })
  @IsDate({ message: 'birthDate must be a valid ISO 8601 date string' }) // validation requires a Date object, so it'll fail if our Transform also failed due an invalid date
  birthDate?: Date; // as a class instance (and in mongoose / mongoDB) it's an actual Date object

  @Prop({ type: [String], enum: UserRole, default: [UserRole.USER] })
  @ApiProperty({ enum: UserRole, enumName: 'UserRole', isArray: true })
  @Expose({ groups: [UserRole.ADMIN] })
  roles: UserRole[];

  @Prop({ type: UserAuth, _id: false, default: {} })
  @ApiProperty()
  @Expose({ groups: ['Admin'] })
  auth: UserAuth;

  @Prop({ type: UserSettings, _id: false, default: {} })
  @ApiProperty()
  settings: UserSettings;

  @Prop({ type: UserPhotos, _id: false, default: {} })
  @ApiProperty()
  photos: UserPhotos;

  @Prop()
  @Expose({ groups: ['Admin'] })
  __v: number;

  /**
   * Accepts a mongoose document from the DB, or a POJO
   */
  constructor(
    partial: Partial<Omit<User, '_id'> & { _id: string | Types.ObjectId }> = {},
  ) {
    if (User.isUserDocument(partial)) {
      Object.assign(this, (partial as UserDocument).toObject());
      return;
    }
    const { _id, ...rest } = partial;
    this._id = typeof _id === 'string' ? new Types.ObjectId(_id) : _id;
    Object.assign(this, rest);
  }

  /**
   * A failsafe in case this class ends up accidentally included inside a nested object in a response
   * (where the global serializer wouldn't find it). Calling instanceToPlain without a group will serialize
   * this object and remove ALL properties that would be excluded to at least ONE user role.
   * */
  toJSON() {
    return instanceToPlain(this);
  }

  isVerified() {
    return this.auth?.email?.valid ?? false;
  }

  static isUserDocument(object) {
    const proto = Object.getPrototypeOf(object);
    return proto instanceof Model && proto.collection.modelName === User.name;
  }
}

export const UserSchema = SchemaFactory.createForClass(User);
