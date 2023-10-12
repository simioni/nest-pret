/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/ban-types */
import { createMock, PartialFuncReturn } from '@golevelup/ts-jest';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { PaginationInfoDto } from '../dto/pagination-info.dto';
import { SortingInfoDto, SortingOrder } from '../dto/sorting-info.dto';
import { StandardResponseInterceptor } from '../interceptors/standard-response.interceptor';
import { StandardResponseOptions } from '../interfaces/standard-response-options.interface';
import { StandardParam, StandardParams } from './standard-param.decorator';
import { StandardResponse } from './standard-response.decorator';

describe('StandardParamDecorator', () => {
  let interceptor: StandardResponseInterceptor;
  let reflector: Reflector;
  let context: ExecutionContext;
  let handler: CallHandler;
  let testPayload;

  function getContext(
    payload,
    decoratorOptions?: StandardResponseOptions,
    reqQuery = {},
  ) {
    class Test {
      @StandardResponse({ type: payload, ...decoratorOptions })
      public handler(): typeof payload {
        return payload;
      }
    }
    const classInstance = new Test();
    return createMock<ExecutionContext>({
      getClass: () => Test,
      getHandler: (): PartialFuncReturn<() => any> => classInstance.handler,
      switchToHttp: () => ({
        getRequest: () => ({
          query: reqQuery,
        }),
      }),
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
    return args[Object.keys(args)[0]].factory;
  }

  beforeEach(async () => {
    reflector = new Reflector();
    interceptor = new StandardResponseInterceptor(reflector);
    context = createMock<ExecutionContext>();
    testPayload = [
      { name: 'mark' },
      { name: 'charlie' },
      { name: 'carol' },
      { name: 'josh' },
    ];
    handler = createMock<CallHandler>({
      handle: () => of(testPayload),
    });
  });

  it('should inject the params object in the request', async () => {
    // testPayload = [{ name: 'mark' }, { name: 'charlie' }, { name: 'carol' }];
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
    expect(response.data.length).toEqual(4);
    expect(response.data[2].name).toEqual(testPayload[2].name);
    // const result = factory(null, { user: mockUser });

    // expect(result).toBe(mockUser);
  });

  it('should support basic params without any options set', async () => {});

  it('should support params for all request features', async () => {
    context = getContext(
      testPayload,
      {
        isPaginated: true,
        minPageSize: 4,
        maxPageSize: 22,
        defaultPageSize: 12,
        isSorted: true,
        sortingFields: ['title', 'author', 'country', 'year'],
        isFiltered: true,
        filteringFields: ['author', 'year'],
      },
      {
        limit: '8',
        offset: '16',
        sort: 'title,-year',
        filter: 'author==John,author==Jake;year>=1890,year<=2000',
      },
    );
    const paramFactory = getParamDecoratorFactory(StandardParam);
    const param: StandardParams = await paramFactory(null, context);
    expect(param).toBeDefined();
    expect(param.setPaginationInfo).toBeDefined();
    expect(param.setSortingInfo).toBeDefined();
    expect(param.setFilteringInfo).toBeDefined();
    param.setPaginationInfo({ count: 340 });

    const userObservable = interceptor.intercept(context, handler);
    const response = await lastValueFrom(userObservable);

    console.log(response);
    expect(response.success).toEqual(true);
    expect(response.isArray).toEqual(true);

    // PAGINATION - from decorator options
    expect(response.isPaginated).toEqual(true);
    expect(response.pagination).toBeDefined();
    expect(response.pagination).toBeInstanceOf(PaginationInfoDto);
    expect(response.pagination.minPageSize).toEqual(4);
    expect(response.pagination.maxPageSize).toEqual(22);
    expect(response.pagination.defaultPageSize).toEqual(12);

    // PAGINATION - from user query
    expect(response.pagination.query).toBeDefined();
    expect(response.pagination.query).toEqual('limit=8&offset=16');
    expect(response.pagination.limit).toEqual(8);
    expect(response.pagination.offset).toEqual(16);

    // PAGINATION - from handler body
    expect(response.pagination.count).toEqual(340);

    // SORTING - from decorator options
    expect(response.isSorted).toEqual(true);
    expect(response.sorting).toBeDefined();
    expect(response.sorting).toBeInstanceOf(SortingInfoDto);
    expect(response.sorting.sortingFields).toBeDefined();
    expect(response.sorting.sortingFields.length).toEqual(4);
    expect(response.sorting.sortingFields[1]).toEqual('author');

    // SORTING - from user query
    expect(response.sorting.query).toBeDefined();
    expect(response.sorting.query).toEqual('');
    expect(Array.isArray(response.sorting.sort)).toEqual(true);
    expect(response.sorting.sort.length).toEqual(2);
    expect(response.sorting.sort[0].field).toEqual('title');
    expect(response.sorting.sort[0].order).toEqual(SortingOrder.ASC);
    expect(response.sorting.sort[1].field).toEqual('year');
    expect(response.sorting.sort[1].order).toEqual(SortingOrder.ASC);

    // FILTERING - from decorator options
    expect(response.isFiltered).toEqual(true);
    expect(response.filtering).toBeDefined();
    expect(response.filtering.filteringFields).toBeDefined();
    expect(response.filtering.filteringFields.length).toEqual(2);
    expect(response.filtering.filteringFields[1]).toEqual('year');

    // FILTERING - from user query

    expect(response.data.length).toEqual(4);
    expect(response.data[3].name).toEqual(testPayload[3].name);
  });
});
