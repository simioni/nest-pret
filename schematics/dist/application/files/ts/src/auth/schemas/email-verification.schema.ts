import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EmailVerificationDocument = HydratedDocument<EmailVerification>;

@Schema()
export class EmailVerification {
  @Prop({ index: true })
  email: string;

  @Prop({ index: true })
  token: string;

  @Prop()
  generatedAt: Date;

  constructor(partial: Partial<EmailVerification> = {}) {
    Object.assign(this, partial);
  }
}

export const EmailVerificationSchema =
  SchemaFactory.createForClass(EmailVerification);
