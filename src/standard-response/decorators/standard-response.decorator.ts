import { applyDecorators } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiQuery,
  getSchemaPath,
} from '@nestjs/swagger';
import { StandardResponseDto } from '../dto/standard-response.dto';
import { StandardResponseOptions } from '../interfaces/standard-response-options.interface';
import {
  RESPONSE_FEATURES,
  RESPONSE_TYPE,
} from '../standard-response.constants';
import { SetStandardResponseFeatures } from './set-standard-response-features.decorator';
import { SetStandardResponseFilteringInfo } from './set-standard-response-filtering-info.decorator';
import { SetStandardResponsePaginationInfo } from './set-standard-response-pagination-info.decorator';
import { SetStandardResponseSortingInfo } from './set-standard-response-sorting-info.decorator';
import { SetStandardResponseType } from './set-standard-response-type.decorator';

type AnyClass = new (...arg) => any;
type ClassOrClassArray = AnyClass | [className: AnyClass];

export function StandardResponse(
  responseDataClass: ClassOrClassArray,
  {
    description,
    isPaginated,
    isSorted,
    isFiltered,
    maxPageSize,
    minPageSize = 1,
    defaultPageSize = 10,
    sortingFields,
    filteringFields,
  }: StandardResponseOptions = {},
) {
  let isArray = false;
  if (Array.isArray(responseDataClass)) {
    isArray = true;
    responseDataClass = responseDataClass[0];
  }
  if (isPaginated) {
    isArray = true;
  }

  const dataArraySchema = {
    type: 'array',
    items: {
      $ref: getSchemaPath(responseDataClass),
    },
  };
  const dataObjSchema = {
    $ref: getSchemaPath(responseDataClass),
  };

  const helpText = [];
  if (typeof minPageSize !== 'undefined') helpText.push(`min: ${minPageSize}`);
  if (typeof maxPageSize !== 'undefined') helpText.push(`max: ${maxPageSize}`);
  if (typeof defaultPageSize !== 'undefined')
    helpText.push(`default: ${defaultPageSize}`);
  const limitHelpText = helpText.length > 0 ? ` (${helpText.join(', ')})` : '';

  const responseFeatures = [];
  if (isPaginated) responseFeatures.push(RESPONSE_FEATURES.PAGINATION);
  if (isSorted) responseFeatures.push(RESPONSE_FEATURES.SORTING);
  if (isFiltered) responseFeatures.push(RESPONSE_FEATURES.FILTERING);

  const decoratorsToApply: (
    | MethodDecorator
    | ClassDecorator
    | PropertyDecorator
  )[] = [
    SetStandardResponseType(RESPONSE_TYPE.STANDARD),
    SetStandardResponseFeatures(responseFeatures),
    ApiExtraModels(StandardResponseDto),
  ];

  if (isPaginated) {
    decoratorsToApply.push(
      SetStandardResponsePaginationInfo({
        minPageSize,
        maxPageSize,
        defaultPageSize,
      }),
      ApiQuery({
        name: 'limit',
        required: false,
        description: `How many items to retrieve${limitHelpText}:`,
        // example: defaultPageSize,
        // schema: { type: 'integer', minimum: minPageSize, maximum: maxPageSize },
      }),
      ApiQuery({
        name: 'offset',
        required: false,
        description: 'How many items to skip from beggining of list:',
        // example: offsetDefault,
        // schema: { type: 'integer', minimum: 0 },
      }),
    );
  }

  if (isSorted) {
    decoratorsToApply.push(
      SetStandardResponseSortingInfo({
        sortingFields,
      }),
      ApiQuery({
        name: 'sort',
        required: false,
        description: `A list of properties used to sort the results. Properties must be separated by comma, and optionally preceded by a minus sign. (Ex: '-popularity,title' )`,
        // example: ['-popularity,name'],
        // schema: { type: 'string' },
      }),
    );
  }

  if (isFiltered) {
    decoratorsToApply.push(
      SetStandardResponseFilteringInfo({
        filteringFields,
      }),
      ApiQuery({
        name: 'filter',
        required: false,
        description: `Restricts results based on filters. A filter is composed of a property name, followed by an operator and a value. (Ex: 'country==Italy'). Filters can be combined using a comma (,) for the OR operation, or a semi-colon (;) for the AND operation. (Ex: to filter by country being equal to Italy or Germany, and year 2010 and later: 'country==Italy,country==Germany;year>=2010')
        Possible operators are:
        ==	Equals
        !=	Not equals
        <=	Less than or equal
        <	Less than
        =@	Contains
        !@	Does not contain
        =^	Starts with
        =$	Ends with.
        These rules are similar to APIs like Google Analytics or Matomo Analytics. For more info, see: https://developers.google.com/analytics/devguides/reporting/core/v3/reference#filters and https://developer.matomo.org/api-reference/reporting-api-segmentation`,
        // example: ['-popularity,name'],
        // schema: { type: 'string' },
      }),
    );
  }

  decoratorsToApply.push(
    ApiOkResponse({
      description: description,
      content: {
        'application/json': {
          schema: {
            allOf: [
              { $ref: getSchemaPath(StandardResponseDto) },
              {
                properties: { data: isArray ? dataArraySchema : dataObjSchema },
              },
            ],
          },
          // examples: {
          //   autoGeneratedFromSchema: {
          //     summary: 'Auto generated from schema',
          //   },
          //   ...buildExampleForEveryRole(responseDataClass),
          //   noRole: {
          //     summary: 'Response for role: Other',
          //     description: `<h3>Invalid request - Insufficient privileges:</h3> This route will never return a response code 200 for the role 'Other'. Any attempt to access it will fail with <strong>HTTP 403: Forbidden.</strong>`,
          //     value: null,
          //   },
          // },
        },
      },
    }),
  );

  return applyDecorators(...decoratorsToApply);
}
