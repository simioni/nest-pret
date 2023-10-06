export enum RESPONSE_TYPE {
  STANDARD = 'standard',
  RAW = 'raw',
}

export enum RESPONSE_FEATURES {
  PAGINATION = 'pagination',
  SORTING = 'sorting',
  FILTERING = 'filtering',
}

export const STANDARD_RESPONSE_TYPE_KEY = 'standard_response_type';
export const STANDARD_RESPONSE_FEATURES_KEY = 'standard_response_features';

export const RESPONSE_PAGINATION_INFO_KEY = 'standard_response_pagination_info';
export const RESPONSE_SORTING_INFO_KEY = 'standard_response_sorting_info';
export const RESPONSE_FILTERING_INFO_KEY = 'standard_response_filtering_info';