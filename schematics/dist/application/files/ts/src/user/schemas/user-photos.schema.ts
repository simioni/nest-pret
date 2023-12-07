import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema()
export class UserPhoto {
  constructor(object: any = {}) {
    this.url = object.url;
    this.sizes = object.sizes;
    this.description = object.description;
    this.tags = object.tags;
    this.date = object.date;
  }

  @Prop()
  @ApiProperty()
  url: string;

  @Prop({ type: [String], default: [] })
  @ApiProperty()
  sizes: string[];

  @Prop()
  @ApiProperty()
  description: string;

  @Prop({ type: [String], default: [] })
  @ApiProperty()
  tags: string[];

  @Prop({ type: Date, default: Date.now })
  @ApiProperty()
  date: Date;
}

export const PhotoSchema = SchemaFactory.createForClass(UserPhoto);

/**
 * User PHOTOS Subschema
 * */
@Schema()
export class UserPhotos {
  @Prop({ type: UserPhoto })
  @ApiProperty()
  profilePic: UserPhoto;

  // @Prop({ type: mongoose.Types.DocumentArray<UserPhoto> }) // @Prop can handle an array [UserPhoto] just fine, as long as it's the only param
  @Prop([UserPhoto])
  @ApiProperty()
  gallery: UserPhoto[];
}
