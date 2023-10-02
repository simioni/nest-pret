import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiExtraModels } from '@nestjs/swagger';
import { AppService } from './app.service';
import { StandardResponse } from './standard-response/decorators/standard-response.decorator';
import {
  StandardParams,
  StandardParam,
} from './standard-response/decorators/standard-param.decorator';
// import { StandardResponse } from './standard-response/decorators/standard-response.decorator';
import { StandardResponseInterceptor } from './standard-response/interceptors/standard-response.interceptor';
// import { ValidatePaginationQueryPipe } from './standard-response/pipes/validate-pagination-query.pipe';

class SomeResponseDto {
  value: string;
}

@Controller()
@ApiExtraModels(SomeResponseDto)
@UseInterceptors(StandardResponseInterceptor)
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @StandardResponse([SomeResponseDto], {
    isPaginated: true,
    maxPageSize: 20,
    minPageSize: 5,
    isSorted: true,
    sortingFields: ['popularity', 'title', 'year'],
    isFiltered: true,
    filteringFields: [
      'year',
      'points',
      'previousPoints',
      'email',
      'medals',
      'titles',
      'cars',
      'name',
      'surname',
      'address',
    ],
  })
  getHello(@StandardParam() params: StandardParams): SomeResponseDto[] {
    // return this.appService.getHello();
    console.log(params);
    params.setPaginationInfo({ count: 36 });
    const rv = new SomeResponseDto();
    rv.value = 'hello';
    return [rv];
    // return rv;
  }

  @Get('/2')
  @StandardResponse(SomeResponseDto)
  getHello2(): SomeResponseDto {
    const rv = new SomeResponseDto();
    rv.value = 'hello2';
    return rv;
  }

  @Get('/3')
  @StandardResponse([SomeResponseDto])
  getHello3(): SomeResponseDto[] {
    const rv = new SomeResponseDto();
    rv.value = 'hello3';
    return [rv, rv];
  }
}
