import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateUserDto } from 'src/user/dto/create-user.dto';

export class ResetPasswordDto extends PickType(CreateUserDto, [
  'email',
  'password',
]) {
  @ApiProperty({
    required: false,
    description:
      'This field is mutually exclusive with resetPasswordToken, and one of them is required.',
  })
  @IsString()
  @IsOptional()
  currentPassword: string;

  @ApiProperty({
    required: false,
    description:
      'This field is mutually exclusive with currentPassword, and one of them is required.',
  })
  @IsString()
  @IsOptional()
  resetPasswordToken: string;
}
