import { Controller, Get } from '@nestjs/common';
import { ApiExtraModels } from '@nestjs/swagger';
import {
  StandardResponse,
  StandardParam,
  StandardParams,
  RawResponse,
} from 'nest-standard-response';
import { AppService } from './app.service';

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
    maxLimit: 20,
    minLimit: 5,
    defaultLimit: 12,
    isSorted: true,
    sortableFields: ['popularity', 'title', 'year'],
    isFiltered: true,
    filterableFields: [
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
    if (params.paginationInfo.limit === 8) {
      params.setPaginationInfo({ count: 326 });
      params.setMessage('you choose 8!');
    }
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
