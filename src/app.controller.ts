import { Controller, Get } from '@nestjs/common';
import { ApiExtraModels } from '@nestjs/swagger';
import { AppService } from './app.service';
import { StandardResponse } from './standard-response/decorators/standard-response.decorator';
import {
  StandardParams,
  StandardParam,
} from './standard-response/decorators/standard-param.decorator';
import { RawResponse } from './standard-response/decorators/raw-response.decorator';

class SomeResponseDto {
  value: string;
}

class SomeRawObjectDefition {
  value: string;
}

@Controller()
@ApiExtraModels(SomeResponseDto)
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @StandardResponse({
    type: [SomeResponseDto],
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
    console.log(params);
    params.setPaginationInfo({ count: 326 });
    // TODO allow setting a message
    // params.setMessage('Some message');
    const rv = new SomeResponseDto();
    rv.value = this.appService.getHello();
    return [rv];
  }

  @Get('/2')
  @StandardResponse({ type: 'string' })
  getHello2(): SomeResponseDto {
    const rv = new SomeResponseDto();
    rv.value = 'hello2';
    return rv;
  }

  @Get('/3')
  @StandardResponse({ type: ['string'] })
  getHello3(): SomeResponseDto[] {
    const rv = new SomeResponseDto();
    rv.value = 'hello3';
    return [rv, rv];
  }

  @Get('/4')
  @StandardResponse({ type: [SomeResponseDto] })
  getHello4(): SomeResponseDto[] {
    const rv = new SomeResponseDto();
    rv.value = 'hello4';
    return [rv, rv];
  }

  @Get('/5')
  @RawResponse({
    type: SomeRawObjectDefition,
    description: 'This is a RAW response!',
  })
  getHello5(): SomeResponseDto[] {
    const rv = new SomeResponseDto();
    rv.value = 'raw hello';
    return [rv];
  }
}
