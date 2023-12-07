import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

const forbiddenFields = ['email', 'password'] as const;

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, forbiddenFields),
) {}
