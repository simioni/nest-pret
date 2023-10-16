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

* [Auth Module](#AuthModule) 🚪
* [Policies Module](#PoliciesModule) 🏛️
* [User Module](#UserModule) 👤
* [Config Module](#ConfigModule) ⚙️
* [StandardResponse Module](#StandardResponseModule) 📦
  * [@StandardResponse()](#StandardResponseDecorator) <sup>decorator</sup>
    * [StandardResponseOptions](#StandardResponseOptions)
    * [@StandardParam()](#StandardParamDecorator) <sup>parameter decorator</sup>
  * [@RawResponse()](#RawResponseDecorator) <sup>decorator</sup>
  * [Advanced Configuration](#StandardResponseConfiguration)

</br>

# Auth Module <a name="AuthModule"></a> 🚪

</br>

# Policies Module <a name="PoliciesModule"></a> 🏛️

</br>

# User Module <a name="UserModule"></a> 👤

</br>

# Config Module <a name="ConfigModule"></a> ⚙️

</br>

# Standard Response Module <a name="StandardResponseModule"></a> 📦

* Metadata-based wrapper to provide customizable and standardized API response objects;

* Built-in handling of pagination, sorting and filtering;

* Allows route handlers to keep returning classes instead of wrapper objects, so they remain fully compatible with interceptors;

[StandardReponse](https://github.com/simioni/nest-standard-response) has been exported to it's own package. Check out the full [documentation](https://github.com/simioni/nest-standard-response) in it's own repo.

<br />
<br />
<br />

---------------------------------------------------

# Tips

## 🔮 You should return class instances from route handlers, not plain objects or DB documents <a name="HandlersMustReturnClassInstances"></a>
NestJS' request pipeline greatly benefits from receiving DTOs or Model class instances as responses from request handlers. This allows interceptors to perform serialization, caching, and other data transformations to the document before sending it to the client.

StandardResponse also rely on an interceptor that uses reflection to read the metadata set by its decorators. Since the typing information and other metadata for Models or DTOs is set on the class that represents them, you need to return instances of these classes from route handlers.

<br />
<br />

## 🔮 Use concrete JS classes as types, not typescript interfaces

Typescript interfaces are completely removed from compiled code. Since we want to perform data validation and transformation during execution, we need the typing information to be available at runtime. NestJS (as well as this library) achieve this by storing type, validation constrainsts and other metadata as properties in the classes that describe the data objects. These can be Models, Entities, Schemas, DTOs or any other class that was anotated with the proper decorators.

<br />
<br />
<br />

---------------------------------------------------

<br />

## 🚀 &nbsp; TODO Milestones

- Add user consent forms with versioned policies
- Add option for log-in using social media accounts
- Add option for delayed email verification (right now it is either required or OFF)
- Add test coverage

</br>


🏭 ⭐️ 🕹️ 💡 💎 🔩 ⚙️ 🧱 🔮 💈 🛍️ 🎁 🪭 ⚜️ ❇️ 🚩
📦 🏷️ 📮 
🟠 🟧 🔶 🔸