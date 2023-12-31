import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  UserAbility,
  CaslAbilityFactory,
} from '../../policies/casl-ability.factory';
import { CHECK_POLICIES_KEY } from '../../policies/decorators/check-policies.decorator';
import { PolicyHandler } from '../../policies/interfaces/policy-handler.interface';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyHandlers =
      this.reflector.get<PolicyHandler[]>(
        CHECK_POLICIES_KEY,
        context.getHandler(),
      ) || [];

    const req = context.switchToHttp().getRequest();
    req.userAbility = this.caslAbilityFactory.createForUser(req.user);

    return policyHandlers.every((handler) =>
      this.execPolicyHandler(handler, req.userAbility),
    );
  }

  private execPolicyHandler(handler: PolicyHandler, ability: UserAbility) {
    if (typeof handler === 'function') {
      return handler(ability);
    }
    return handler.handle(ability);
  }
}
