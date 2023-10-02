/* eslint-disable @typescript-eslint/ban-types */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
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

@Injectable()
export class StandardResponseInterceptor implements NestInterceptor {
  private responseType: RESPONSE_TYPE;
  private responseFeatures: RESPONSE_FEATURES[];
  private handler: Function;

  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    this.handler = context.getHandler();
    this.responseType = this.reflector.get(
      STANDARD_RESPONSE_TYPE_KEY,
      this.handler,
    );
    this.responseFeatures = this.reflector.get(
      STANDARD_RESPONSE_FEATURES_KEY,
      this.handler,
    );

    return next.handle().pipe(
      map((data) => {
        if (data instanceof HttpException) {
          // throw data
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
        this.handler,
      );
      responseFields.pagination = paginationInfo;
    }

    if (this.responseFeatures.includes(RESPONSE_FEATURES.SORTING)) {
      const sortingInfo = this.reflector.get<SortingInfoDto>(
        RESPONSE_SORTING_INFO_KEY,
        this.handler,
      );
      responseFields.sorting = sortingInfo;
    }

    if (this.responseFeatures.includes(RESPONSE_FEATURES.FILTERING)) {
      const filteringInfo = this.reflector.get<FilteringInfoDto>(
        RESPONSE_FILTERING_INFO_KEY,
        this.handler,
      );
      responseFields.filtering = filteringInfo;
    }

    // console.log(responseFields);

    transformFunction = (data) =>
      new StandardResponseDto({ ...responseFields, data });

    // if (this.responseType === RESPONSE_TYPE.STANDARD) {
    //   transformFunction = (data) => new StandardResponseDto({ data });
    // }

    // if (this.responseType === RESPONSE_TYPE.PAGINATED) {
    //   const pagination = this.reflector.get<PaginationInfoDto>(
    //     PAGINATION_INFO_KEY,
    //     this.handler,
    //   );
    //   transformFunction = (data) =>
    //     new PaginatedResponseDto({ data, pagination });
    // }

    return transformFunction(data);
  }
}
