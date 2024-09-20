import { FilterQuery, UpdateQuery } from 'mongoose';
import { AxiosHeaders } from 'axios';

export interface ObjectIdDto {
  _id: string;
}

export interface FilterDto<T extends Record<string, any>> {
  filter: FilterQuery<T>;
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

export interface RealtimeClientOptions<
  ModelMap extends Record<string, any> = Record<string, any>,
> {
  baseURL: string;
  // A Header Factory function that will run on every request made. This is where you should return your auth headers.
  headers?: AxiosHeaders;
  // Websocket Auth Payload, this will be sent on connectiong to backend via websocket.
  wsAuth?: () => Promise<Record<string, any>> | Record<string, any>;
  // Turn on cookies for the rest client, and socket client.
  withCredentials?: boolean;
  // functions to be used to deserialize the data coming in
  deserializers?: Deserializers<ModelMap>;
}
