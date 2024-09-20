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

export const initializeRealtimeMongo = <
  ModelMap extends Record<string, any> = Record<string, any>,
>(
  options: RealtimeClientOptions<ModelMap>,
) => {
  const databaseRest = new RealtimeRestClient<ModelMap>(options);
  const databaseSocket = new RealtimeSocketClient<ModelMap>(options);

  return { databaseRest, databaseSocket };
};

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
