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
import type { RealtimeClientOptions, Type } from './types';

export const initializeRealtimeMongo = <
  ModelMap extends Record<string, Type> = Record<string, Type>,
>(
  options: Omit<RealtimeClientOptions<ModelMap>, 'deserializers'>,
  deserializers?: ModelMap,
) => {
  const databaseRest = new RealtimeRestClient<ModelMap>({
    ...options,
    deserializers,
  });

  const databaseSocket = new RealtimeSocketClient<ModelMap>({
    ...options,
    deserializers,
  });
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
