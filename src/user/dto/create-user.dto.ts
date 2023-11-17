import { IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { User } from '../schemas/user.schema';

const requiredFields = ['email', 'password'] as const;
const optionalFields = ['name', 'surname', 'phone', 'birthdaydate'] as const;

export class CreateUserDto extends IntersectionType(
  PartialType(PickType(User, optionalFields)),
  PickType(User, requiredFields),
) {}
