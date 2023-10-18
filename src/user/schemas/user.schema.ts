// import { Photo } from 'common/schemas/photo.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import { HydratedDocument, Types } from 'mongoose';
import { UserRole } from '../user.constants';
import { UserAuth } from './user-auth.schema';
import { UserPhotos } from './user-photos.schema';
import { UserSettings } from './user-settings.schema';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  // _id should NOT be declared explicitly to mongoose (with the @Prop() decorator)
  @ApiProperty({ type: 'string' })
  @Transform(({ value }) => value.toString())
  _id: Types.ObjectId;

  @Prop()
  @Exclude()
  password: string;

  @Prop()
  @ApiProperty({ example: 'chasehiggens3310@gmail.com' })
  email: string;

  @Prop({ type: Date, default: Date.now })
  date: Date;

  @Prop()
  @ApiProperty({ example: 'Chase' })
  name: string;

  @Prop()
  @ApiProperty({ example: 'Higgens' })
  surname: string;

  @Prop()
  @ApiProperty({ example: '09 3478857' })
  phone?: string;

  @Prop()
  @ApiProperty({ example: '07-23-1992' })
  @Expose({ groups: ['Admin'] })
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
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.virtual('isAdmin').get(function () {
  return this.roles.includes(UserRole.ADMIN);
});
