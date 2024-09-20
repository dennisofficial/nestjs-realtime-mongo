import { RealtimeRestClient } from './rest-client';
import { RealtimeSocketClient } from './socket-client';
import {
  ApiError,
  ConflictError,
  InternalServerError,
  ServiceUnavailableError,
  UnauthorizedError,
  ValidationError,
} from './errors';
import type { RealtimeClientOptions } from './types';

export {
  RealtimeRestClient,
  RealtimeSocketClient,
  ApiError,
  ConflictError,
  InternalServerError,
  ServiceUnavailableError,
  ValidationError,
  UnauthorizedError,
};
export type { RealtimeClientOptions };
