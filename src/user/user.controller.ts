import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  StandardParam,
  StandardParams,
  StandardResponse,
} from 'nest-standard-response';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { EmailOrIdPipe } from './pipes/email-or-id.pipe';
import { User } from './schemas/user.schema';
import { UserService } from './user.service';

@Controller('user')
@ApiTags('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
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
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.createNewUser(createUserDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all users',
    description: 'Get a list of all users. Supports pagination.',
  })
  @StandardResponse({
    type: [User],
    description: 'The list of users',
    isPaginated: true,
  })
  findAll(@StandardParam() param: StandardParams) {
    return this.userService.findAll({
      limit: param.paginationInfo.limit,
      offset: param.paginationInfo.offset,
    });
  }

  @Get(':idOrEmail')
  @ApiOperation({ summary: 'Find one user by their email or ID' })
  @ApiParam({ name: 'idOrEmail', type: 'string' })
  @StandardResponse({ type: User })
  async findOne(
    @Param('idOrEmail', EmailOrIdPipe) idOrEmail: string,
  ): Promise<User> {
    const user = await this.userService.findOne(idOrEmail);
    return user;
  }

  @Patch(':idOrEmail')
  @ApiOperation({ summary: 'Update data for one user by their email or ID' })
  @ApiParam({ name: 'idOrEmail', type: 'string' })
  @StandardResponse({
    type: User,
    description: 'User updated successfully',
  })
  async update(
    @Param('idOrEmail', EmailOrIdPipe) idOrEmail: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.userService.update(idOrEmail, updateUserDto);
    return user;
  }

  @Delete(':idOrEmail')
  @ApiOperation({ summary: 'Delete one user by their email or ID' })
  @ApiParam({ name: 'idOrEmail', type: 'string' })
  @StandardResponse({
    description: 'User deleted successfully',
  })
  async remove(
    @Param('idOrEmail', EmailOrIdPipe) idOrEmail: string,
  ): Promise<Record<string, never>> {
    await this.userService.remove(idOrEmail);
    return {};
  }
}
