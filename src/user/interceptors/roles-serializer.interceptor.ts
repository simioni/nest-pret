/**
 * A role-aware transform Interceptor to serialize documents before sending them in responses.
 *
 * It's similar to NestJs' built-in ClassSerializer and works by using decorators on the properties
 * of schemas, like @Expose({ group: ['Admin'] }) or @Exclude(), to define which properties are
 * exposed to which groups (roles).
 *
 * The main difference between RolesSerializer and ClassSerializer is in the way they
 * handle Role based serialization:
 *
 * - ClassSerializer:
 *
 *   Allows the use of a decorator on controllers or methods, like
 *   @SerializeOptions({ groups: ['Admin'] }), making those methods serialize the response
 *   document into an object containing only the fields that should be visible to those groups.
 *
 *   This aproach is simple, but limited. It means that to serve different serializations to different
 *   groups (like sending the full document to Admins but only some fields to Users) the entire method
 *   needs to be duplicated, often with an identical signature and implementation, only with authorization
 *   policies and SerializeOptions changed.
 *
 * - RolesSerializer:
 *
 *   Instead of requiring a set of static roles for every method, this interceptor dynamically taps into
 *   the ExecutionContext's request object to retrieve the information for the logged in user that is making
 *   the request, and which Roles the user has access to.
 *
 *   It them passes these Roles as options to the class-transformer's instanceToPlain() method, which is what
 *   ClassSerializer also does under the hood. But by setting these Roles dynamically, it allows the same
 *   controllers and methods to respond with different serializations for different users, depending on the
 *   roles they have.
 */

import {
  CallHandler,
  ClassSerializerInterceptor,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  Logger,
  PlainLiteralObject,
} from '@nestjs/common';
import * as classTransformer from 'class-transformer';
import { classToPlain } from 'class-transformer';
import mongoose from 'mongoose';
import { map, Observable } from 'rxjs';

function isMongooseDocument(obj) {
  if (!obj) return false;
  return obj instanceof mongoose.Document;
}

const mongooseDocumentConsoleWarning =
  'This can leak sensitive data as it would skip all interceptors, such as role-based serialization. Make sure to construct the appropriate class or DTO from the documents before returning them.';
const mongooseDocumentErrorMessage = 'Invalid return DTO';

@Injectable()
export class RolesSerializerInterceptor extends ClassSerializerInterceptor {
  private readonly logger = new Logger(RolesSerializerInterceptor.name);

  constructor(reflector, defaultOptions = {}) {
    // ClassSerializerInterceptor allows passing a custom transformer package as options, and if none is provided it
    // will dynamically require class-transformer. This dynamic import is causing issues in the e2e test environment
    // because TestModule has a different version of class-transformer. By passing the transformer package from here,
    // we can "lock it" to the exact same package used by the rest of the app.
    const options = {
      ...defaultOptions,
      transformerPackage: classTransformer,
    };
    super(reflector, options);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const userRoles = context.switchToHttp().getRequest().user?.roles ?? [];
    // console.log(`Serializing data for role: ${userRoles}`);
    const contextOptions = this.getContextOptions(context);
    const options = {
      ...this.defaultOptions,
      ...contextOptions,
      groups: userRoles,
    };

    return next.handle().pipe(
      map((res: PlainLiteralObject | Array<PlainLiteralObject>) => {
        const isArray = Array.isArray(res);
        if (isArray) {
          if (res.some((value) => isMongooseDocument(value))) {
            this.logger.error(
              `Can't include raw mongoose documents in the return array! ${mongooseDocumentConsoleWarning}`,
            );
            return new InternalServerErrorException(
              mongooseDocumentErrorMessage,
            );
          }
        }

        if (!isArray && isMongooseDocument(res)) {
          this.logger.error(
            `Can't return raw mongoose documents! ${mongooseDocumentConsoleWarning}`,
          );
          return new InternalServerErrorException(mongooseDocumentErrorMessage);
        }

        console.log(res);
        // console.log('-------------- AFTER classToPlain: ', options);
        // console.log(classToPlain(res, options));
        console.log('-------------- AFTER this.serialize: ');
        console.log(this.serialize(res, options));

        return this.serialize(res, options);
      }),
    );
  }
}
