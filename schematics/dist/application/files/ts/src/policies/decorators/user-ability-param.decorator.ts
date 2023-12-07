import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const UserAbilityParam = createParamDecorator(
  (data: any, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const userAbility = request.userAbility;
    return userAbility;
  },
);
