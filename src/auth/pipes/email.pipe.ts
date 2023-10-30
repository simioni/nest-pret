import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { isEmail } from 'class-validator';
import { AUTH_ERROR } from '../auth.constants';

@Injectable()
export class EmailPipe implements PipeTransform {
  transform(value: string, metadata: ArgumentMetadata): string {
    const valueIsEmail = isEmail(value);
    if (valueIsEmail) return value;
    throw new BadRequestException(AUTH_ERROR.EMAIL_SYNTAX_ERROR);
  }
}
