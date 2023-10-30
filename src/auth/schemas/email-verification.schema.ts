import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EmailVerificationDocument = HydratedDocument<EmailVerification>;

@Schema()
export class EmailVerification {
  @Prop()
  email: string;

  @Prop()
  emailToken: string;

  @Prop()
  timestamp: Date;
}

export const EmailVerificationSchema =
  SchemaFactory.createForClass(EmailVerification);
