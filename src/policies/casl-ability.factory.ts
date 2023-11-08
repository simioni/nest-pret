import {
  AbilityBuilder,
  createMongoAbility,
  ExtractSubjectType,
  InferSubjects,
  MongoAbility,
  MongoQuery,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { User, UserDocument } from '../user/schemas/user.schema';
import { UserRole } from '../user/user.constants';

class Article {
  id: number;
  isPublished: boolean;
  authorId: number;
}

export enum Action {
  Manage = 'manage',
  List = 'list',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

type Subjects = InferSubjects<typeof Article | typeof User> | 'all';
type PossibleAbilities = [Action, Subjects];

export type UserAbility = MongoAbility<PossibleAbilities, MongoQuery>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: UserDocument) {
    const { can, cannot, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, MongoQuery>,
    );
    // Users
    if (user.roles.includes(UserRole.USER)) {
      can([Action.Read, Action.Update], User, { _id: user._id });
      // can(Action.Read, User, { birthdaydate: user.birthdaydate })
      // can([Action.Read, Action.Update], Article, { authorId: user._id });
    }
    // Admins
    if (user.roles.includes(UserRole.ADMIN)) {
      can(Action.Manage, 'all');
    }
    return build({
      // Read https://casl.js.org/v5/en/guide/subject-type-detection#use-classes-as-subject-types for details
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
