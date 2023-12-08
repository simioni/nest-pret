import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

enum DeleteUserConfirmationString {
  DELETE_USER = 'DELETE USER',
}

export class DeleteUserDto {
  @ApiProperty({ example: DeleteUserConfirmationString.DELETE_USER })
  @IsEnum(DeleteUserConfirmationString)
  confirmationString: DeleteUserConfirmationString;
}
