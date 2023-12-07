import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { User } from '../schemas/user.schema';
import { EMAIL_VERIFICATION_ERROR } from '../user.constants';

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const req = context.switchToHttp().getRequest();
    const user: User = req.user;

    if (user.isVerified()) return true;

    throw new ForbiddenException(
      EMAIL_VERIFICATION_ERROR.VERIFY_EMAIL_TO_PROCEED,
    );
  }
}
