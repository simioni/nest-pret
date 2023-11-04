import { UnprocessableEntityException } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { USER_REGISTRATION_ERROR } from '../user.constants';

// Since jun 2022, the corrent reason phrase for 422 is 'Unprocessable Content'
// See: https://stackoverflow.com/a/52098667/6175916
export class RegistrationValidationError extends UnprocessableEntityException {
  constructor(errors: ValidationError[]) {
    super({
      statusCode: 422,
      error: 'Unprocessable Content',
      message: USER_REGISTRATION_ERROR.VALIDATION_FAILED,
      errors: errors.map((error) => {
        return {
          field: error.property,
          errors: error.constraints,
        };
      }),
    });
  }
}
