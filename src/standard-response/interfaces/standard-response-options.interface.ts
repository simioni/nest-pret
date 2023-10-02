import { PaginatedResponseOptions } from './paginated-response-options.interface';
import { SortedResponseOptions } from './sorted-response-options.interface';
import { FilteredResponseOptions } from './filtered-response-options.interface';

export interface StandardResponseOptions
  extends PaginatedResponseOptions,
    SortedResponseOptions,
    FilteredResponseOptions {
  description?: string;
  isPaginated?: boolean;
  isSorted?: boolean;
  isFiltered?: boolean;
}
