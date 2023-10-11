/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/ban-types */
import { createMock, PartialFuncReturn } from '@golevelup/ts-jest';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { StandardResponseInterceptor } from '../interceptors/standard-response.interceptor';
import { StandardParam, StandardParams } from './standard-param.decorator';
import { StandardResponse } from './standard-response.decorator';

describe('StandardParamDecorator', () => {
  let interceptor: StandardResponseInterceptor;
  let reflector: Reflector;
  let context: ExecutionContext;
  let handler: CallHandler;
  let testPayload;

  function getContext(payload, decoratorOptions?) {
    class Test {
      @StandardResponse(decoratorOptions)
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

  /**
   * Retrieves the factory used by NestJS to inject the param into the route handler. This factory
   * is called every time a request comes in, and has access to the ExecutionContext in order to
   * generate the value that the param should have inside the handler.
   */
  function getParamDecoratorFactory(
    paramDecorator: Function,
  ): (data: any, context: ExecutionContext) => StandardParams {
    class Test {
      public handler(@paramDecorator() value) {}
    }
    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'handler');
    // console.log(args[Object.keys(args)[0]].factory);
    return args[Object.keys(args)[0]].factory;
  }

  beforeEach(async () => {
    reflector = new Reflector();
    interceptor = new StandardResponseInterceptor(reflector);
    context = createMock<ExecutionContext>();
    testPayload = {
      id: '1234',
      name: 'mark',
    };
    handler = createMock<CallHandler>({
      handle: () => of(testPayload),
    });
  });

  it('should support returning arrays of objects', async () => {
    testPayload = [{ name: 'mark' }, { name: 'charlie' }, { name: 'carol' }];
    context = getContext(testPayload, { isPaginated: true });
    const paramFactory = getParamDecoratorFactory(StandardParam);
    const param: StandardParams = await paramFactory(null, context);
    expect(param).toBeDefined();
    expect(param.setPaginationInfo).toBeDefined();
    param.setPaginationInfo({ count: 330 });
    const userObservable = interceptor.intercept(context, handler);
    const response = await lastValueFrom(userObservable);
    // console.log(response);
    expect(response.success).toEqual(true);
    expect(response.isArray).toEqual(true);
    expect(response.pagination).toBeDefined();
    expect(response.pagination.count).toEqual(330);
    expect(response.data.length).toEqual(3);
    expect(response.data[2].name).toEqual(testPayload[2].name);
    // const result = factory(null, { user: mockUser });

    // expect(result).toBe(mockUser);
  });
});
