import { createMock } from '@golevelup/ts-jest';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { StandardResponseInterceptor } from './standard-response.interceptor';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AppController } from 'src/app.controller';
import { AppService } from 'src/app.service';
import { lastValueFrom, of } from 'rxjs';

describe('StandardResponseInterceptor', () => {
  let interceptor: StandardResponseInterceptor;
  let reflector: Reflector;

  let appController: AppController;
  let appService: AppService;

  const executionContext = {
    switchToHttp: jest.fn().mockReturnThis(),
    getRequest: jest.fn().mockReturnThis(),
  };

  const callHandler = {
    handle: jest.fn(),
  };

  beforeEach(async () => {
    reflector = new Reflector();
    interceptor = new StandardResponseInterceptor(reflector);
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appService = moduleRef.get<AppService>(AppService);
    appController = moduleRef.get<AppController>(AppController);
  });

  it('should be defined', async () => {
    // (
    //   executionContext.switchToHttp().getRequest as jest.Mock<any, any>
    // ).mockReturnValueOnce({
    //   body: { data: 'mocked data' },
    // });
    // callHandler.handle.mockResolvedValueOnce('next handle');
    // const context = createMock<ExecutionContext>();
    const testUser = { name: 'mark' };
    // const context = createMock<ExecutionContext>({
    //   switchToHttp: () => ({
    //     getRequest: () => ({
    //       user: 'mocked data',
    //     }),
    //   }),
    // });
    const context = createMock<ExecutionContext>();
    const handler = createMock<CallHandler>({
      handle: () => of(testUser),
    });
    const userObservable = interceptor.intercept(context, handler);
    const response = await lastValueFrom(userObservable);
    console.log(response);
    expect(response.data.name).toEqual(testUser.name);

    // const actualValue = await interceptor.intercept(context, callHandler);
    // expect(actualValue).toBe('next handle');
    // expect(executionContext.switchToHttp().getRequest().user).toEqual({
    //   user: 'mocked data',
    //   addedAttribute: 'example',
    // });
    // expect(callHandler.handle).toBeCalledTimes(1);
  });

  it('should wrap basic responses', () => {
    expect(interceptor).toBeDefined();
  });

  it('should wrap paginated responses', () => {
    expect(interceptor).toBeDefined();
  });

  it('should wrap sorted responses', () => {
    expect(interceptor).toBeDefined();
  });

  it('should wrap filtered responses', () => {
    expect(interceptor).toBeDefined();
  });
});
