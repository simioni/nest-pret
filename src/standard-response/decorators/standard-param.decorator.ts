import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PaginationInfoDto } from '../dto/pagination-info.dto';
import { FilteringInfoDto } from '../dto/filtering-info.dto';
import { SortingInfoDto } from '../dto/sorting-info.dto';
import { getFilteringInfo } from '../utils/getFilteringInfo.util';
import { getPaginationInfo } from '../utils/getPaginationInfo.util';
import { getSortingInfo } from '../utils/getSortingInfo.util';

export interface PaginationParams {
  paginationInfo: PaginationInfoDto;
  setPaginationInfo: (metadata: Partial<PaginationInfoDto>) => void;
}

export interface SortingParams {
  sortingInfo: SortingInfoDto;
  setSortingInfo: (metadata: Partial<SortingInfoDto>) => void;
}

export interface FilteringParams {
  filteringInfo: FilteringInfoDto;
  setFilteringInfo: (metadata: Partial<FilteringInfoDto>) => void;
}

export interface StandardParams
  extends PaginationParams,
    SortingParams,
    FilteringParams {}

export const StandardParam = createParamDecorator(
  async (data: string, ctx: ExecutionContext) => {
    const pagination = await getPaginationInfo(ctx);
    const sorting = await getSortingInfo(ctx);
    const filtering = await getFilteringInfo(ctx);
    const params: StandardParams = {
      ...pagination,
      ...sorting,
      ...filtering,
    };
    return params;
  },
);
