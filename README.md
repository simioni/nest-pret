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
* [Config Module](#ConfigModule)
* [StandardResponse Module](#StandardResponseModule)
  * [@StandardResponse() Decorator](#StandardResponseDecorator)
    * [StandardResponseOptions](#StandardResponseOptions)
    * [@StandardParam() Param Decorator](#StandardParamDecorator)
  * [@RawResponse() Decorator](#RawResponseDecorator)

# Auth Module <a name="AuthModule"></a>

# Policies Module <a name="PoliciesModule"></a>

# User Module <a name="UserModule"></a>

# Config Module <a name="ConfigModule"></a>

# Standard Response Module <a name="StandardResponseModule"></a>

* Metadata-based wrapper to provide customizable standard API response objects, including pagination, sorting and filtering.

* Allows route handlers to keep returning DTOs instead of wrapper objects, so they remain fully compatible with interceptors.

To set up, just import ```StandardResponseModule.forRoot()``` in the imports array of your application module.

```ts
@Module({
  imports: [
    StandardResponseModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

## ✅ @StandardResponse(_options?:_ [_StandardResponseOptions_](#StandardResponseOptions)) <a name="StandardResponseDecorator"></a>

<br />

The ```@StandardResponse()``` decorator causes the return of a route handler to be wrapped into a standardized API response object, while still allowing the handler to return true DTOs or other model class instances.

This makes interceptors like caching, ```ClassSerializer```, or ```RoleSerializer``` work transparently.

The wrapper allow custom messages to be set in the response, and has optional features to handle common tasks, like **pagination, sorting and filtering**.

It can also optionally apply swagger's documentation ```@ApiResponse```, providing the correct combined schema for the DTO and the wrapper including any of its features.

If given an array of Roles, it can also build Swagger route response examples for each user role, containing the reponse as it would be serialized for that user group.

<br/>

> Your route handler must return an instance of a concrete class (such as a DTO or Model), or an array of them. Plain JS objcts will not work! [See why](#HandlersMustReturnClassInstances)

<br/>

``` ts
import { UserDto } from './dto/user.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Get('/')
  @StandardResponse({ type: [UserDto] })
  async findAll(): Promise<UserDto[]> {
    const users = await this.usersService.findAll();
    return users // <--- returns an array of UserDtos
  }
}

// get /api/users
// Response:
{
  "success": true,
  "isArray": true,
  "data": [
    Users... // <--- The returned array is delivered inside the data property
  ]
}
```

(TODO image of swagger UI with the response examples dropdown open. Comparing a response for User and Admin, with arrows showcasing the extra fields returned only to admin)

<br />

-------------------------------------------

<br />

## ✅ StandardResponseOptions <a name="StandardResponseOptions"></a>

<br />

<table>
  <tr>
    <th>Option</th>
    <th>Type</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>type</td>
    <td><i>Class</i></td>
    <td>The class that represents the object(s) that will be returned from the route (for example, a Model or a DTO). This option is required to get auto-documentation.</td>
  </tr>
  <tr>
    <td>description</td>
    <td><i>string</i></td>
    <td>Used as the desciption field of the response in the OpenAPI docs.</td>
  </tr>
  <tr>
    <td>isPaginated</td>
    <td><i>boolean</i></td>
    <td>Mark the route to serve paginated responses, and allow the use of pagination options. This will capture and validate <code>limit</code> and <code>offset</code> query parameters, and make them available in the handler via <code>@StandardParam</code>. Also sets up pagination fields in the response object. </td>
  </tr>
  <tr>
    <td>isSorted</td>
    <td><i>boolean</i></td>
    <td>Mark the route to serve sorted responses, and allow the use of sorting options. This will capture and validate the <code>sort</code> query parameter, and make it available in the handler via <code>@StandardParam</code>. Also sets up sorting fields in the response object. </td>
  </tr>
  <tr>
    <td>isFiltered</td>
    <td><i>boolean</i></td>
    <td>Mark the route to serve filtered responses, and allow the use of filtering options. This will capture and validate the <code>filter</code> query parameter, parse it into a <code>FilteringQuery</code>, an and make it available in the handler via <code>@StandardParam</code>. Also sets up filtering fields in the response object. </td>
  </tr>
  <tr>
    <th colspan="3"></th>
  </tr>
  <tr>
    <td>defaultPageSize</td>
    <td><i>number</i></td>
    <td><i><b>(Pagination option) </b></i>The value to used for <code>limit</code> if the query param is missing. <i><b>(Defaults to 10)</b></i></td>
  </tr>
  <tr>
    <td>maxPageSize</td>
    <td><i>number</i></td>
    <td><i><b>(Pagination option) </b></i>The maximum value accepted by the <code>limit</code> query param.</td>
  </tr>
  <tr>
    <td>minPageSize</td>
    <td><i>number</i></td>
    <td><i><b>(Pagination option) </b></i>The minimum value accepted by the <code>limit</code> query param.</td>
  </tr>
  <tr>
    <th colspan="3"></th>
  </tr>
  <tr>
    <td>sortableFields</td>
    <td><i>string[]</i></td>
    <td><i><b>(Sorting option) </b></i>A list of fields that can used for sorting. If left undefined, all fields will be accepted.</td>
  </tr>
  <tr>
    <th colspan="3"></th>
  </tr>
  <tr>
    <td>filterableFields</td>
    <td><i>string[]</i></td>
    <td><i><b>(Filtering option) </b></i>A list of fields that can used for filtering. If left undefined, all fields will be accepted.</td>
  </tr>
</table>

<br />

---------------------------------------------------

## ✅ @StandardParam() <a name="StandardParamDecorator"></a>

<br />

The ```@StandardParam()``` is a parameter decorator used to inject a ```StandardParams``` object in the route handler. This object allows access to all metadata set by ```@StandardResponse()```, as well as all the information captured from query parameters.

<br />

``` ts
import { UserDto } from './dto/user.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Get('/')
  @StandardResponse({
    type: [UserDto],
    isPaginated: true,
    maxLimit: 24,
    defaultLimit 12,
  })
  async findAll(
    @StandardParam() params: StandardParams // <--- inject into handler
  ): Promise<UserDto[]> {
    const [users, count] = await this.usersService.findAll({
      limit: params.pagination.limit,
      offset: params.pagination.offset,
    });
    params.setPaginationInfo({ count: 348 }) // <--- set additional info
    return users;
  }
}

// get /api/users?limit=15&offset=30
// Response:
{
  "success": true,
  "isArray": true,
  "isPaginated": true,
  "pagination: {
    count: 348, // <--- added inside the handler
    limit: 15, // <--- from query
    offset: 30,
    maxLimit: 24, // <--- from decorator options
    defaultLimit: 12,
  }
  "data": [
    Users...
  ]
}
```

<br />

The params object injected with @StandardParam() contains three properties:

```ts
{
  pagination: PaginationInfo,
  sorting: SortingInfo,
  filtering: FilteringInfo,
}

```
It also contain three methods, so you can update the data inside the handler when needed (like defining the pagination total count, which is only known after a DB query)

```ts
{
  setPaginationInfo: (info: {}) => void,
  setSortingInfo: (info: {}) => void,
  setFilteringInfo: (info: {}) => void,
}
```

<br />

## PaginationInfo

<table style="width: 100%;">
  <tr>
    <th>Property</th>
    <th>Type</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>query?</td>
    <td><i>string</i></td>
    <td>The original query string from the request for the pagination params.</td>
  </tr>
  <tr>
    <td>limit?</td>
    <td><i>number</i></td>
    <td>How many items to send. This is the same as the <code>limit</code> query param, but parsed and validated.</td>
  </tr>
  <tr>
    <td>offset?</td>
    <td><i>number</i></td>
    <td>How many items to skip. This is the same as the <code>offset</code> query param, but parsed and validated.</td>
  </tr>
  <tr>
    <td>count?</td>
    <td><i>number</i></td>
    <td>The total count of items that are being paginated. This value needs to be set inside the handler using the <code>setPaginationInfo()</code> method.</td>
  </tr>
  <tr>
    <td>maxPageSize?</td>
    <td><i>number</i></td>
    <td>The maximum value accepted by the <code>limit</code> query param. (As set in the <code>@StandardResponse()</code> decorator options).</td>
  </tr>
  <tr>
    <td>minPageSize?</td>
    <td><i>number</i></td>
    <td>The minimum value accepted by the <code>limit</code> query param. (As set in the <code>@StandardResponse()</code> decorator options).</td>
  </tr>
  <tr>
    <td>defaultPageSize?</td>
    <td><i>number</i></td>
    <td>The default number of items to send if no query <code>limit</code> is provided. (As set in the <code>@StandardResponse()</code> decorator options).</td>
  </tr>
</table>

<br />

## SortingInfo

<br />

```ts
class PaginationInfoDto {
  query?: string;
  sort?: SortingOperation[];
  sortableFields?: string[];
}
```

<br />

## FilteringInfo

<br />

```ts
class PaginationInfoDto {
  query?: string;
  filter?: FilteringQueryGroup;
  filterableFields?: string[];
}
```

<br />
<br />
<br />

---------------------------------------------------

<br />

## ✅ @RawResponse() <a name="RawResponseDecorator"></a>

The default behavior of StandardResponse is to wrap the response from all routes application wide. This keeps the API consistent and predictable. However, if you need to skip this behavior for a particular route, just set the ```@RawResponse()``` decorator:

```ts
@Controller('external-api-integration')
export class ExternalApiIntegrationController {
  @Get('/')
  @RawResponse() // <--- will skip wrapping
  async findAll(): Promise<SomeCustomObject> {
    return customObject;
  }
}
```


If you're adding StandardResponse into an existing app, it might be useful to invert this behavior to create a gradual transition path. To do this, set the ```interceptAll``` option to ```false``` when importing the ```StandardResponseModule``` in your application. This way, routes will only be wrapped if they have explicitly set the ```@StandardResponse()``` decorator. See more information in the "Configuring" section bellow.

<br />

---------------------------------------------------

<br />

# Configuring

## ✅ validateResponse

Allows you to provide a validation function to stop the return of a route if certain conditions are met.

For example: this can abort a request if a route tries to return — instead a DTO — a raw DB document or some other object that may leak information not intended to be exposed.

This function should return ```false``` to abort the request.

```ts
@Module({
  imports: [
    StandardResponseModule.forRoot({
      validateResponse: (data) => {
        if (isMongooseObject(data)) return false;
        return true;
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

<br/>

## ✅ interceptAll

Setting ```interceptAll``` to ```false``` will invert the default behavior of wrapping all routes by default, and will instead only wrap routes decorated with ```@StandardResponse()```.

```ts
@Module({
  imports: [
    StandardResponseModule.forRoot({
      interceptAll: false
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

<br />

# Tips

## ✅ You should return class instances from route handlers, not plain objects or DB documents <a name="HandlersMustReturnClassInstances"></a>
NestJS' request pipeline greatly benefits from receiving DTOs or Model class instances as responses from request handlers. This allows interceptors to perform serialization, caching, and other data transformations to the document before sending it to the client.

StandardResponse also rely on an interceptor that uses reflection to read the metadata set by its decorators. Since the typing information and other metadata for Models or DTOs is set on the class that represents them, you need to return instances of these classes from route handlers.

<br />
<br />

## ✅ Use concrete JS classes as types, not typescript interfaces

Typescript interfaces are completely removed from compiled code. Since we want to perform data validation and transformation during execution, we need the typing information to be available at runtime. NestJS (as well as this library) achieve this by storing type, validation constrainsts and other metadata as properties in the classes that describe the data objects. These can be Models, Entities, Schemas, DTOs or any other class that was anotated with the proper decorators.

<br />
<br />
<br />

---------------------------------------------------

<br />

## 🚀 TODO Milestones

- Add user consent forms with versioned policies
- Add option for log-in using social media accounts
- Add option for delayed email verification (right now it is either required or OFF)
- Add test coverage
