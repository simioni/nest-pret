# NestJS + Mongoose + Passport + Casl + Swagger + Docker

A fully tested, fully documented, production-ready NestJS project that solves much of the basic functionality common in many projects.

It allows:

- User registration
- E-mail verification
- Password recovery
- Claims-based access control, including:
  - A PoliciesGuard to restrict access to routes only to users who can access them
  - A RolesSerializerInterceptor to serialize the response into an object containing only the fields that the user has access to
- Versioned user consent for TOS / Cookies / Privacy and other policies
- Standardized and paginated responses

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

## TODO Milestones

- Add user consent forms with versioned policies
- Add option for log-in using social media accounts
- Add option for delayed email verification (right now it is either required or OFF)
- Add test coverage
