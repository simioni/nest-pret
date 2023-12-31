import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  StandardParam,
  StandardParams,
  StandardResponse,
} from 'nest-standard-response';
import { Action, UserAbility } from 'src/policies/casl-ability.factory';
import { CheckPolicies } from 'src/policies/decorators/check-policies.decorator';
import { UserAbilityParam } from 'src/policies/decorators/user-ability-param.decorator';
import { PoliciesGuard } from 'src/policies/guards/policies.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { EmailVerifiedGuard } from './guards/email-verified.guard';
import { EmailOrIdPipe } from './pipes/email-or-id.pipe';
import { User } from './schemas/user.schema';
import { UserService } from './user.service';

@Controller('user')
@UseGuards(AuthGuard('jwt'), PoliciesGuard, EmailVerifiedGuard)
@ApiBearerAuth()
@ApiTags('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @CheckPolicies((ability: UserAbility) => ability.can(Action.List, User))
  @ApiOperation({ summary: 'List all users' })
  @StandardResponse({
    type: [User],
    description: 'The list of users',
    isPaginated: true,
  })
  public findAll(@StandardParam() param: StandardParams) {
    return this.userService.findAll({
      limit: param.paginationInfo.limit,
      offset: param.paginationInfo.offset,
    });
  }

  @Post()
  @CheckPolicies((ability: UserAbility) => ability.can(Action.Create, User))
  @ApiOperation({
    summary: 'Create a new user',
    description:
      'Adds a new user to the DB using the given email and password. This request will fail if the email already exists or if the password is too weak.',
  })
  @StandardResponse({
    type: User,
    status: 201,
    description: 'User created successfully',
  })
  public create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get(':idOrEmail')
  @CheckPolicies((ability: UserAbility) => ability.can(Action.Read, User))
  @ApiOperation({ summary: 'Find one user by their email or ID' })
  @ApiParam({ name: 'idOrEmail', type: 'string' })
  @StandardResponse({ type: User, description: 'User found' })
  public async findOne(
    @Param('idOrEmail', EmailOrIdPipe) idOrEmail: string,
    @UserAbilityParam() userAbility: UserAbility,
  ): Promise<User> {
    const user = await this.userService.findOne(idOrEmail);
    if (!userAbility.can(Action.Read, user)) throw new ForbiddenException();
    return user;
  }

  @Patch(':idOrEmail')
  @CheckPolicies((ability: UserAbility) => ability.can(Action.Update, User))
  @ApiOperation({ summary: 'Update data for one user by their email or ID' })
  @ApiParam({ name: 'idOrEmail', type: 'string' })
  @StandardResponse({ type: User, description: 'User updated successfully' })
  public async update(
    @Param('idOrEmail', EmailOrIdPipe) idOrEmail: string,
    @Body() updateUserDto: UpdateUserDto,
    @UserAbilityParam() userAbility: UserAbility,
  ): Promise<User> {
    const user = await this.userService.update(idOrEmail, updateUserDto);
    if (!userAbility.can(Action.Update, user)) throw new ForbiddenException();
    return user;
  }

  @Delete(':idOrEmail')
  @CheckPolicies((ability: UserAbility) => ability.can(Action.Delete, User))
  @ApiOperation({ summary: 'Delete one user by their email or ID' })
  @ApiParam({ name: 'idOrEmail', type: 'string' })
  @StandardResponse({ description: 'User deleted successfully' })
  public async remove(
    @Param('idOrEmail', EmailOrIdPipe) idOrEmail: string,
    @Body() _ignored_dto_still_validated_by_global_validator: DeleteUserDto,
  ): Promise<Record<string, never>> {
    await this.userService.remove(idOrEmail);
    return {};
  }
}
