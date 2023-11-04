import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ForgottenPasswordDocument = HydratedDocument<ForgottenPassword>;

@Schema()
export class ForgottenPassword {
  @Prop({ index: true })
  email: string;

  @Prop({ index: true })
  token: string;

  @Prop()
  generatedAt: Date;

  constructor(partial: Partial<ForgottenPassword> = {}) {
    Object.assign(this, partial);
  }
}

export const ForgottenPasswordSchema =
  SchemaFactory.createForClass(ForgottenPassword);
