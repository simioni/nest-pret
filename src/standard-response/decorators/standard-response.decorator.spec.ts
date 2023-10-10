import { createMock, PartialFuncReturn } from '@golevelup/ts-jest';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { StandardResponseInterceptor } from '../interceptors/standard-response.interceptor';
import { STANDARD_RESPONSE_TYPE_KEY } from '../standard-response.constants';
import { StandardResponse } from './standard-response.decorator';

describe('StandardResponseDecorator', () => {
  let interceptor: StandardResponseInterceptor;
  let reflector: Reflector;
  let context: ExecutionContext;
  let handler: CallHandler;
  let testPayload;

  function getContext(payload, decoratorOptions?) {
    class Test {
      @StandardResponse(undefined, decoratorOptions)
      public handler(): any {
        return payload;
      }
    }
    const classInstance = new Test();
    return createMock<ExecutionContext>({
      getClass: () => Test,
      getHandler: (): PartialFuncReturn<() => any> => classInstance.handler,
    });
  }

  beforeEach(async () => {
    reflector = new Reflector();
    context = createMock<ExecutionContext>();
    testPayload = {
      id: '1234',
      name: 'mark',
    };
    handler = createMock<CallHandler>({
      handle: () => of(testPayload),
    });
  });

  it('should be defined', () => {
    expect(reflector).toBeDefined();
    expect(context).toBeDefined();
    expect(handler.handle).toBeDefined();
  });

  it('should support returning individual objects', async () => {
    interceptor = new StandardResponseInterceptor(reflector);
    const userObservable = interceptor.intercept(context, handler);
    const response = await lastValueFrom(userObservable);
    expect(response.success).toEqual(true);
    expect(response.data.name).toEqual(testPayload.name);
  });

  it('should support returning arrays of objects', async () => {
    testPayload = [{ name: 'mark' }, { name: 'charlie' }, { name: 'carol' }];
    context = getContext(testPayload, { isPaginated: true });
    console.log(context.getClass(), context.getHandler());
    console.log(
      reflector.get(STANDARD_RESPONSE_TYPE_KEY, context.getClass()),
      reflector.get(STANDARD_RESPONSE_TYPE_KEY, context.getHandler()),
      // Reflect.getMetadataKeys(test, 'routeHandler'),
      // Reflect.getOwnMetadataKeys(test, 'routeHandler'),
      // Reflect.getMetadata(STANDARD_RESPONSE_TYPE_KEY, test.routeHandler),
    );
    // console.log(Reflect.getMetadataKeys(Test.prototype, 'routeHandler'));
    // console.log(Reflect.getMetadataKeys(Test));
    // const decorate = StandardResponse([String], { isPaginated: true });
    // handler = createMock<CallHandler>({
    //   handle: () => of(testPayload),
    // });
    // decorate(handler);
    interceptor = new StandardResponseInterceptor(reflector);
    const userObservable = interceptor.intercept(context, handler);
    const response = await lastValueFrom(userObservable);
    console.log(response);
    expect(response.success).toEqual(true);
    expect(response.isArray).toEqual(true);
    expect(response.data.length).toEqual(3);
    expect(response.data[2].name).toEqual(testPayload[2].name);
  });
});
