import { FilterQuery, ProjectionType, UpdateQuery } from 'mongoose';
import { AxiosHeaders } from 'axios';

export interface ObjectIdDto {
  _id: string;
}

export interface FilterObjectIdDto<T extends Record<string, any>> {
  _id: string;
  projection?: ProjectionType<T>;
}

export interface FilterDto<T extends Record<string, any>> {
  filter: FilterQuery<T>;
  projection?: ProjectionType<T>;
}

export interface DataSingleDto<T extends Record<string, any>> {
  data: T;
}

export interface DataArrayDto<T extends Record<string, any>> {
  data: T[];
}

export interface UpdateIdDto<T extends Record<string, any>> {
  _id: string;
  update: UpdateQuery<T>;
}

export interface UpdateDto<T extends Record<string, any>> {
  filter: FilterQuery<T>;
  update: UpdateQuery<T>;
}

type Deserializers<T extends Record<string, any>> = {
  [K in keyof T]: (data: any) => T[K];
};

/**
 * Configuration options for the Realtime Client.
 *
 * @template ModelMap - A mapping of model names to their respective data types.
 */
export interface RealtimeClientOptions<
  ModelMap extends Record<string, any> = Record<string, any>,
> {
  /**
   * The base URL of the API server.
   * This is the root URL where your API is hosted.
   *
   * @example 'https://api.example.com'
   */
  baseURL: string;

  /**
   * Custom headers to include with every HTTP request made by the client.
   * This should not be used for authentication headers.
   * Use this to set any static headers required by your API.
   *
   * @example
   * {
   *   'Content-Type': 'application/json',
   *   'X-Custom-Header': 'custom-value',
   * }
   */
  headers?: Record<string, string> | AxiosHeaders;

  /**
   * A function that returns an authentication payload for WebSocket connections.
   * This payload will be sent during the WebSocket handshake to authenticate the client.
   *
   * The function can return the payload directly or return a promise that resolves to the payload.
   *
   * @returns A promise that resolves to an object containing authentication data, or the object itself.
   *
   * @example
   * // Asynchronous function returning a promise
   * async () => {
   *   const token = await fetchWebSocketToken();
   *   return { token };
   * }
   */
  wsAuth?: () => Promise<Record<string, any>> | Record<string, any>;

  /**
   * A function that returns authentication data for REST API requests.
   * This function is called before each REST API request to retrieve fresh authentication data.
   *
   * The function can return the authentication data directly or return a promise that resolves to the data.
   *
   * @returns A promise that resolves to an object containing authentication data (e.g., headers), or the object itself.
   *
   * @example
   * // Asynchronous function returning a promise
   * async () => {
   *   const token = await fetchRestApiToken();
   *   return { 'Authorization': `Bearer ${token}` };
   * }
   */
  restAuth?: () => Promise<Record<string, string>> | Record<string, string>;

  /**
   * Indicates whether cross-site Access-Control requests should be made using credentials such as cookies, authorization headers, or TLS client certificates.
   *
   * Set this to `true` if your API requires credentials like cookies or you need to make authenticated cross-origin requests.
   *
   * @default false
   *
   * @example
   * true
   */
  withCredentials?: boolean;
}
