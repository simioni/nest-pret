import { Controller, Get } from '@nestjs/common';
import { ApiExtraModels } from '@nestjs/swagger';
import {
  StandardParam,
  StandardParams,
  StandardResponse,
} from 'nest-standard-response';
import { AppService } from './app.service';

class SomeResponseDto {
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
    if (params.paginationInfo.limit === 8) {
      params.setPaginationInfo({ count: 326 });
      params.setMessage('you choose 8!');
    }
    const rv = new SomeResponseDto();
    rv.value = this.appService.getHello();
    return [rv];
  }
}
