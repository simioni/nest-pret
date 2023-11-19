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
  // TODO maybe uncomment these transforms? Here's why:
  // These are redundant since the password property is already removed from the serialized object due to
  // the decorator @Exclude({ toPlainOnly: true }).
  // So excluding the password property here is just a failsafe in case the document from the database is
  // inadvertently sent in resposes without being converted to the User class first.
  // But this failsafe comes at a cost: it's also the reason why we need the 'returnRawMongooseObject' option
  // in the findOne method of the UserService. Sometimes we need to access the password from the user object,
  // and removing it here means the password will never the present in the User class, forcing us to pass
  // raw mongoose documents around in those cases.
  // So these are the design options we have to explore:
  //
  // 1. No failsafe transforms. DB documents should never be sent in responses, and the global Serializer already
  //    prevents responses that try to send raw mongoose documents. However it can't prevent these responses if
  //    the documents are nested in other objects. This options would allow us to removed the returnRawMongooseObject
  //    option and just use instaneces of the User class for everything.
  // 2. Keep failsafe transforms. This absolutly guarantess that passwords will never leak in responses, even in the
  //    event of an extreme developer error ending up in production. Services that require the user information
  //    including their password will have to keep explicitly ask for it with 'returnRawMongooseObject'.
  // 3. Keep the failsafe in the toJSON method only, and use the toObject method to cast the document to an instance of
  //    the User class. The User class should also have its toJSON method overriden to perform the same transform as the schema.
  //    Methods from the UserService would then be changed to use toObject instead of toJSON when returning users.
  //    This achieves the same security in reponses, while allowing the User class to carry the password field internally.
  //    Methods from the UserService can still ask the consumer to explicitly ask for the password if they want it, but would
  //    achieve this by using the .select('-password') mongoose method to include/exclude de password field.
  //
  // toJSON: { transform: removePassword },
  // toObject: { transform: removePassword },
})
export class User {
  // _id should NOT be declared explicitly to mongoose (with the @Prop() decorator)
  @ApiProperty({ type: 'string' })
  @Transform(({ value }) => value.toString(), { toPlainOnly: true })
  @Transform(({ value }) => new Types.ObjectId(value), { toClassOnly: true })
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

  constructor({
    _id,
    ...rest
  }: Partial<Omit<User, '_id'> & { _id: string | Types.ObjectId }> = {}) {
    if (_id) this._id = typeof _id === 'string' ? new Types.ObjectId(_id) : _id;
    Object.assign(this, rest);
  }

  /**
   * A failsafe in case this class ends up accidentally included inside a nested object in a response
   * (where class-transformer wouldn't find it).
   * */
  toJSON() {
    const ret = { ...this };
    delete ret.password;
    delete ret.roles;
    delete ret.auth;
    delete ret.birthdaydate;
    delete ret.__v;
    return ret;
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
