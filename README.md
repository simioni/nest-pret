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
- Secure defaults:
  - Sets secure HTTP response headers (using helmet)
  - Global IP request rate limiting
  - Account creation rate limiting

<br />

# Getting started

* Clone this repo
* Edit the ```/src/config.ts``` file and add your mailer service information.



## Start using Docker
To start using Docker, run:

    npm run dev

It will use docker-compose to lift a Mongo DB, a Mongo-Express visual DB admin page on port 8081, and the NestJS app in watch mode.

> If running in Docker, you're not required to run ```npm install``` locally, but you still might want to do so in order to get features such as auto-import and auto-complete in your code editor.

## Start without docker

Make sure to edit ```/src/config.ts``` file to add the connection information for your mongo database, then run:

    npm install
    npm run start:dev

<br />

---------------------------------------------------------------------------
# Reference

* [Auth Module](#AuthModule)
* [Policies Module](#PoliciesModule)
* [User Module](#UserModule)
* [StandardResponse Module](#StandardResponseModule)
  * [@StandardResponse() Decorator](#StandardResponseDecorator)
  * [@PaginatedResponse() Decorator](#PaginatedResponseDecorator)
    * [@PaginationParam() Decorator](#PaginationParamDecorator)
  * [@RawResponse() Decorator](#RawResponseDecorator)

## Auth Module <a name="AuthModule"></a>

## Policies Module <a name="PoliciesModule"></a>

## User Module <a name="UserModule"></a>

## Standard Response Module <a name="StandardResponseModule"></a>
### ✅ @StandardResponse(Class, _options?:_ [_StandardResponseOptions_](#StandardResponseOptions)) <a name="StandardResponseDecorator"></a>

The ```@StandardResponse()``` decorator wraps the returned document (or array of documents) from a route handler into a standardized API response object containing metadata about the request.

It also applies the swagger documentation ```@ApiResponse``` decorator, providing the correct combined schema for the DTO and the standard reponse object, as well as building example responses for each user role, containing the reponse document properly serialized for their role according to access control policies.

To use this decorator, you must pass in as its first argument the class that represents the type of the object(s) that will be returned from the route (for example, a Model or a DTO).

> Your route handler must return an instance of a concrete class, or an array of them. Plain JS objcts will not work! [See why](#HandlersMustReturnClassInstances)

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

### StandardResponseOptions <a name="StandardResponseOptions"></a>

The ```@StandardResponse()``` decorator can also accept an optional configuration object as its second parameter.

The configuration object currently has a single field: ```description```. It is used as the desciption of this response in the OpenAPI docs.

``` ts
type StandardResponseOptions = {
  description?: string
}
```

<br />

### ✅ @PaginatedResponse(Class, _options?:_ [_PaginatedResponseOptions_](#PaginatedResponseOptions)) <a name="PaginatedResponseDecorator"></a>
The ```@PaginatedResponse()``` is an extension of the StandardResponse that supports pagination. It also properly configures swagger schemas and examples, but allows the use of the ```@PaginationParam()``` parameter decorator to inject the pagination object into the handler. The pagination object contains information about the query params received from the client, as well as methods to set the pagination information, such as total count of results, before returning the results normally.

> Your route handler must return an instance of a concrete class, or an array of them. Plain JS objcts will not work! [See why](#HandlersMustReturnClassInstances)

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

### PaginatedResponseOptions <a name="PaginatedResponseOptions"></a>

The ```@PaginatedResponse()``` decorator can accept an optional second parameter containing a configuration object.

Just like in ```@StandardResponse()```, the ```description``` field of the configuration is used to describe the response in the OpenAPI docs.

The other options (```minPageSize```, ```maxPageSize```, ```defaultPageSize```) are used across several places. They:

* Provide the default value used if the route was called without query parameters
* Are included in the response object to let the client know how many/few items it can ask at a time
* Are used for validation of the query parameters input
* Are fully documented in the OpenAPI docs, with descriptions, examples and client side param validation

``` ts
type PaginatedResponseOptions = {
  description?: string,
  minPageSize?: number,
  maxPageSize?: number,
  defaultPageSize?: number
}
```

<br />

### ✅ @PaginationParam() decorator <a name="PaginationParamDecorator"></a>

A param decorator to be injected into a route handler that was annotated with ```@PaginatedResponse()```. It provides one property, ```query```, containing the validated query data sent from the client in the following format: ```{ limit: number, offset: number }```. It also contains two methods, ```get()``` and ```set()```, allowing you to read the current pagination metadata (composed by default values plus the query from the client), or setting extra information in it, like the total ```count``` of items.

``` ts
@PaginatedResponse(UserDto)
async findAll(
  @PaginationParam() pagination: Pagination,
): Promise<UserDto[]> {
  const { limit, offset } = pagination.query
  pagination.set({ count: 123 })
  ...
}

// pagination object
{
  query: {
    limit: number,
    offset: number
  },
  get: () => PaginationInfoDto,
  set: (metadata: Partial<PaginationInfoDto>) => void
}
```

<br />

### ✅ @RawResponse() decorator <a name="RawResponseDecorator"></a>

The ```@RawResponse()``` decorator skips wrapping the response and sends the data returned by the handler directly as the route response. This is useful if you set the @StandardResponse() on the controller or even the application level, but wants to override that behavior in a particular route. (For example, to provide a response formatted to other API that you do not control).

<br />

### ✅ You should return class instances from route handlers, not plain objects or DB documents <a name="HandlersMustReturnClassInstances"></a>
NestJS' request pipeline greatly benefits from receiving DTOs or Model class instances as responses from request handlers. This allows interceptors to perform serialization, caching, and other data transformations to the document before sending it to the client.

StandardResponse also rely on an interceptor that uses reflection to read the metadata set by its decorators. Since the typing information and other metadata for Models or DTOs is set on the class that represents them, you need to return instances of these classes from route handlers.

### ✅ Use concrete JS classes as types, not typescript interfaces

Typescript interfaces are a developer utility feature, and are completely removed from compiled code. Since we want to perform data validation and transformation on deployed code, we need the typing information to be available at runtime. NestJS (as well as this library) achieve this by storing type, validation constrainsts and other metadata as properties in the classes that describe the data objects. These can be Models, Entities, Schemas, DTOs or any other class that was anotated with the proper decorators.

<br />

## 🚀 TODO Milestones

- Add user consent forms with versioned policies
- Add option for log-in using social media accounts
- Add option for delayed email verification (right now it is either required or OFF)
- Add test coverage
