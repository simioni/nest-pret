// import { Photo } from 'common/schemas/photo.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import { IsDateString, IsEmail, IsInt, Min } from 'class-validator';
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
  toJSON: { transform: removePassword },
  toObject: { transform: removePassword },
})
export class User {
  // _id should NOT be declared explicitly to mongoose (with the @Prop() decorator)
  @ApiProperty({ type: 'string' })
  @Transform(({ value }) => value.toString())
  _id: Types.ObjectId;

  @Prop()
  @Exclude()
  password: string;

  @Prop({ index: { unique: true } })
  @ApiProperty({ example: 'chasehiggens3310@gmail.com' })
  @IsEmail()
  email: string;

  @Prop({ type: Date, default: Date.now })
  @IsDateString()
  date: Date;

  @Prop()
  @ApiProperty({ example: 'Chase' })
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
  @Expose({ groups: ['Admin'] })
  roles: UserRole[];

  @Prop({ type: UserAuth, _id: false })
  @ApiProperty()
  @Expose({ groups: ['Admin'] })
  auth: UserAuth;

  @Prop({ type: UserSettings, _id: false })
  @ApiProperty()
  settings: UserSettings;

  @Prop({ type: UserPhotos, _id: false })
  @ApiProperty()
  photos: UserPhotos;

  @Prop()
  @Expose({ groups: ['Admin'] })
  __v: number;

  constructor(partial: Partial<User> = {}) {
    Object.assign(this, partial);
  }

  isVerified: () => boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

// UserSchema.virtual('isAdmin').get(function () {
//   return this.roles.includes(UserRole.ADMIN);
// });

UserSchema.methods.isVerified = function () {
  return this.auth?.email?.valid ?? false;
};
