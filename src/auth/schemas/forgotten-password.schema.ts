import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ForgottenPasswordDocument = HydratedDocument<ForgottenPassword>;

@Schema()
export class ForgottenPassword {
  @Prop({ index: true })
  email: string;

  @Prop({ index: true })
  newPasswordToken: string;

  @Prop()
  timestamp: Date;
}

export const ForgottenPasswordSchema =
  SchemaFactory.createForClass(ForgottenPassword);
