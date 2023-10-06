import { SetMetadata } from '@nestjs/common';
import {
  RESPONSE_TYPE,
  STANDARD_RESPONSE_TYPE_KEY,
} from '../standard-response.constants';

export const RawResponse = () =>
  SetMetadata(STANDARD_RESPONSE_TYPE_KEY, RESPONSE_TYPE.RAW);
