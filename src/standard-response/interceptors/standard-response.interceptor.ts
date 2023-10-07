/* eslint-disable @typescript-eslint/ban-types */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { StandardResponseDto } from '../dto/standard-response.dto';
// import { PaginatedResponseDto } from '../dto/paginated-response.dto';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PaginationInfoDto } from '../dto/pagination-info.dto';
import {
  STANDARD_RESPONSE_TYPE_KEY,
  STANDARD_RESPONSE_FEATURES_KEY,
  RESPONSE_PAGINATION_INFO_KEY,
  RESPONSE_TYPE,
  RESPONSE_FEATURES,
  RESPONSE_SORTING_INFO_KEY,
  RESPONSE_FILTERING_INFO_KEY,
} from '../standard-response.constants';
import { SortingInfoDto } from '../dto/sorting-info.dto';
import { FilteringInfoDto } from '../dto/filtering-info.dto';

export interface StandardResponseInterceptorOptions {
  interceptAll?: boolean;
}

const defaultOptions: StandardResponseInterceptorOptions = {
  interceptAll: true,
};

@Injectable()
export class StandardResponseInterceptor implements NestInterceptor {
  private responseType: RESPONSE_TYPE;
  private responseFeatures: RESPONSE_FEATURES[];
  private routeController: new (...args) => {};
  private routeHandler: Function;

  constructor(
    private reflector: Reflector,
    @Optional()
    protected readonly options: StandardResponseInterceptorOptions = defaultOptions,
  ) {}

  // TODO should accept a initialization object with options: (forFeature?)
  // should intercept every route? (even unannotated ones)
  // should prevent sending ORM documents directly to client?

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    this.routeController = context.getClass();
    this.routeHandler = context.getHandler();

    this.responseType = this.reflector.getAllAndOverride(
      STANDARD_RESPONSE_TYPE_KEY,
      [this.routeHandler, this.routeController],
    );

    if (!this.responseType && !this.options.interceptAll) {
      return next.handle();
    }

    this.responseFeatures =
      this.reflector.getAllAndMerge(STANDARD_RESPONSE_FEATURES_KEY, [
        this.routeHandler,
        this.routeController,
      ]) ?? [];

    return next.handle().pipe(
      map((data) => {
        if (data instanceof HttpException) {
          return data;
        }
        return this.transformResponse(data);
      }),
    );
  }

  transformResponse(data) {
    let transformFunction;

    if (this.responseType === RESPONSE_TYPE.RAW) {
      transformFunction = (data) => data;
    }

    const responseFields: Partial<StandardResponseDto<typeof data>> = {};

    if (this.responseFeatures.includes(RESPONSE_FEATURES.PAGINATION)) {
      const paginationInfo = this.reflector.get<PaginationInfoDto>(
        RESPONSE_PAGINATION_INFO_KEY,
        this.routeHandler,
      );
      responseFields.pagination = paginationInfo;
    }

    if (this.responseFeatures.includes(RESPONSE_FEATURES.SORTING)) {
      const sortingInfo = this.reflector.get<SortingInfoDto>(
        RESPONSE_SORTING_INFO_KEY,
        this.routeHandler,
      );
      responseFields.sorting = sortingInfo;
    }

    if (this.responseFeatures.includes(RESPONSE_FEATURES.FILTERING)) {
      const filteringInfo = this.reflector.get<FilteringInfoDto>(
        RESPONSE_FILTERING_INFO_KEY,
        this.routeHandler,
      );
      responseFields.filtering = filteringInfo;
    }

    // console.log(responseFields);

    transformFunction = (data) =>
      new StandardResponseDto({ ...responseFields, data });

    return transformFunction(data);
  }
}
