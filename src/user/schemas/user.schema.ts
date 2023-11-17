// import { Photo } from 'common/schemas/photo.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import { IsDateString, IsEmail, IsInt, Min, MinLength } from 'class-validator';
import { HydratedDocument, Types } from 'mongoose';
import { UserRole } from '../user.constants';
import { UserAuth } from './user-auth.schema';
import { UserPhotos } from './user-photos.schema';
import { UserSettings } from './user-settings.schema';

export type UserDocument = HydratedDocument<User>;

const removePassword = function (doc: UserDocument, ret: Record<string, any>) {
  delete ret.password;
  return ret;
};

@Schema({
  timestamps: true,
  // TODO uncomment these!
  // toJSON: { transform: removePassword },
  // toObject: { transform: removePassword },
})
export class User {
  // _id should NOT be declared explicitly to mongoose (with the @Prop() decorator)
  @ApiProperty({ type: 'string' })
  @Transform(({ value }) => {
    console.log(`transforming _id into a string: ${value.toString()}`);
    return value.toString();
  })
  _id: Types.ObjectId;

  @Prop()
  @ApiProperty({ required: true, example: 'PASSWORD' })
  @MinLength(8)
  @Exclude({ toPlainOnly: true }) // exclude only when serializing (classToPlain), but keep when creating a new User from a POJO (plainToClass)
  password: string;

  @Prop({ index: { unique: true } })
  @ApiProperty({ example: 'markhiggens3310@gmail.com' })
  @IsEmail()
  email: string;

  @Prop({ type: Date, default: Date.now })
  @IsDateString()
  date: Date;

  @Prop()
  @ApiProperty({ example: 'Mark' })
  name: string;

  @Prop()
  @ApiProperty({ example: 'Higgens' })
  surname: string;

  @Prop()
  @ApiProperty({ example: '093478857' })
  @IsInt()
  @Min(100000, { message: 'phone must have at least 6 digits' })
  phone?: string;

  @Prop()
  @ApiProperty({ example: '07-23-1992' })
  @Expose({ groups: ['Admin'] })
  @IsDateString()
  birthdaydate?: Date;

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

  constructor(partial: Partial<User> = {}) {
    Object.assign(this, partial);
  }

  isVerified() {
    return this.auth?.email?.valid ?? false;
  }
}

export const UserSchema = SchemaFactory.createForClass(User);

// UserSchema.virtual('isAdmin').get(function () {
//   return this.roles.includes(UserRole.ADMIN);
// });

UserSchema.methods.isVerified = function () {
  return this.auth?.email?.valid ?? false;
};
