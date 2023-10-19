import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { isEmail } from 'class-validator';
import { Types } from 'mongoose';
import { USER_ERROR } from '../user.constants';

@Injectable()
export class EmailOrIdPipe implements PipeTransform {
  transform(value: string, metadata: ArgumentMetadata): string {
    const valueIsEmail = isEmail(value);
    if (valueIsEmail) return value;

    const valueIsObjectId = this.isObjectId(value);
    if (valueIsObjectId) return value;

    throw new BadRequestException(USER_ERROR.INVALID_EMAIL_OR_ID);
  }

  isObjectId(value): boolean {
    if (!Types.ObjectId.isValid(value)) return false;
    const cast = new Types.ObjectId(value);
    return value === cast.toString();
  }
}
