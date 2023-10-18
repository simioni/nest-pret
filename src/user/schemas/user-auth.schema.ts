import { Prop, Schema } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/**
 * User AUTH Subschemas
 * */
@Schema()
class UserAuthEmail {
  @Prop({ type: Boolean, default: false })
  @ApiProperty()
  valid: boolean;
}

@Schema()
class UserAuthFacebook {
  @Prop()
  @ApiProperty()
  @Expose({ groups: ['Admin'] })
  userid: string;
}

@Schema()
class UserAuthGmail {
  @Prop()
  @ApiProperty()
  @Expose({ groups: ['Admin'] })
  userid: string;
}

@Schema()
export class UserAuth {
  @Prop({ type: UserAuthEmail, _id: false })
  @ApiProperty()
  email?: UserAuthEmail;

  @Prop({ type: UserAuthFacebook, _id: false })
  @ApiProperty()
  @Expose({ groups: ['Admin'] })
  facebook?: UserAuthFacebook;

  @Prop({ type: UserAuthGmail, _id: false })
  @ApiProperty()
  @Expose({ groups: ['Admin'] })
  gmail?: UserAuthGmail;
}
