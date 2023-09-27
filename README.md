# NestJS + Mongoose + Passport + Casl + Swagger + Docker

A fully tested, fully documented, production-ready NestJS project that solves much of the common basic functionality required for many projects.

- User registration
- E-mail verification
- Password recovery
- User consent for TOS, Cookies, Policies, etc
- Claims-based access control, including:
  - Restricted access to routes via policies to specific user groups
  - Restricted access to specific documents by ownership or other conditional policies
  - Serialization of the response object to contain only the fields to which the user role has access to
- Standardized API responses, including:
  - Automatic wrapping of the route handlers return object into a StandardResponse
  - Generation of OpenAPI documentation for routes with proper response schema
  - Generation of OpenAPI response examples with proper serialization for each user role

## Before starting
Edit the ```/src/config.ts``` file and add your mailer service information.



## Start using Docker
To start using Docker, run:

    npm run dev

It will use docker-compose to lift a Mongo DB, a Mongo-Express visual DB admin page on port 8081, and the NestJS app in watch mode.

## Start without docker

Make sure to edit ```/src/config.ts``` file to add the connection information for your mongo database, then run:

    npm install
    npm run start:dev

---------------------------------------------------------------------------
# Reference

* [AuthModule](#AuthModule)
* [PoliciesModule](#PoliciesModule)
* [UserModule](#UserModule)
* [StandardResponseModule](#StandardResponseModule)
  * [StandardResponseDecorator](#StandardResponse)
  * [PaginatedResponseDecorator](#PaginatedResponse)
  * [RawResponseDecorator](#RawResponse)

## Auth Module <a name="AuthModule"></a>

## Policies Module <a name="PoliciesModule"></a>

## User Module <a name="UserModule"></a>

## Standard Response Module <a name="StandardResponseModule"></a>
### ✅ StandardResponse decorator <a name="StandardResponseDecorator"></a>
The ```@StandardResponse()``` decorator wraps the returned document (or array of documents) from a route handler into a standardized API response object containing metadata about the request.
It also applies the swagger documentation ```@ApiResponse``` decorator, providing the correct combined schema for the DTO and the standard reponse object, as well as building example responses for each user role, containing the reponse document as it would be serialized for their role access control policies.

``` ts
import { UserDto } from './dto/user.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Get('/')
  @StandardResponse(UserDto)
  async findAll(): Promise<UserDto[]> {
    const users = await this.usersService.findAll();
    return users // <----- returns an array of UserDtos
  }
}

// get /api/users
// Response:
{
  "success": true,
  "isArray": true,
  "data": [
    Users... // <----- The array of UserDtos is wrapped and delivered inside the data property
  ]
}
```

(TODO image of swagger UI with the response examples dropdown open. Comparing a response for User and Admin, with arrows showcasing the extra fields returned only to admin)

<br />

### ✅ PaginatedResponse decorator <a name="PaginatedResponseDecorator"></a>
The ```@PaginatedResponse()``` is an extension of the StandardResponse that supports pagination. It also properly configures swagger schemas and examples, but allows the use of the ```@PaginationParam()``` parameter decorator to inject the pagination object into the handler. The pagination object contains information about the query params received from the client, as well as methods to set the pagination information, such as total count of results, before returning the results normally.

``` ts
import { UserDto } from './dto/user.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Get('/')
  @PaginatedResponse(UserDto)
  async findAll(
    @PaginationParam() pagination: Pagination, // <----- injects the pagination object into the handler
  ): Promise<UserDto[]> {
    const { limit, offset } = pagination.query

    const count = await this.usersService.countAll();
    pagination.set({ count })

    const users = await this.usersService.findAll(limit, offset);    
    return users
  }
}

// get /api/users?limit=10&offset=20
// Response:
{
  "success": true,
  "isArray": true,
  "isPaginated": true,
  "pagination": {
    "limit": 10,
    "offset": 20,
    "count": 192,
    "minPageSize": 5,
    "maxPageSize": 20,
  },
  "data": [
    Users... // <----- The array of UserDtos is wrapped and delivered inside the data property
  ]
}
```

<br />

### ✅ RawResponse decorator <a name="RawResponseDecorator"></a>

The ```@RawResponse()``` decorator skips wrapping the response and sends the data returned by the handler directly as the route response. This is useful if you set the @StandarResponse() on the controller or even the application level, but wants to override that behavior in a particular route. (For example, to provide a response formatted to other API that you do not control).

<br />

### ✅ You should return class instances from route handlers, not plain objects or DB documents
NestJS' request pipeline greatly benefits from receiving DTOs or Model class instances as responses from request handlers. This allows interceptors to perform serialization, caching, and other data transformations to the document before sending it to the client.

StandardResponse also rely on an interceptor that uses reflection to read the metadata set by its decorators in order to write documentation and properly wrap the response.

Since the typing information and other metadata for Models or DTOs is set on the class that represents them, you need to return instances of these classes from route handlers.

<br />

## 🚀 TODO Milestones

- Add user consent forms with versioned policies
- Add option for log-in using social media accounts
- Add option for delayed email verification (right now it is either required or OFF)
- Add test coverage
