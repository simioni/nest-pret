import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ForgottenPasswordDocument = HydratedDocument<ForgottenPassword>;

@Schema()
export class ForgottenPassword {
  @Prop()
  email: string;

  @Prop()
  newPasswordToken: string;

  @Prop()
  timestamp: Date;
}

export const ForgottenPasswordSchema =
  SchemaFactory.createForClass(ForgottenPassword);
