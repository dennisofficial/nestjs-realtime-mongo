import type { FilterQuery } from 'mongoose';
import type { Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import {
  ChangeStreamDeleteDocument,
  ChangeStreamInsertDocument,
  ChangeStreamReplaceDocument,
  ChangeStreamUpdateDocument,
} from 'mongodb';
import { WebsocketQuery } from './dto/websocket.query';

export type Return<F> = F extends () => Promise<infer R> ? R : never;

export interface ListenMap {
  query: (data: FilterQuery<any>) => void;
  document: (data: { _id: string }) => void;
}

export interface EmitMap {
  data: (data: any[]) => void;
  update: (data: { _id: string; data: any }) => void;
  remove: (data: { _id: string }) => void;
  add: (data: { _id: string; data: any }) => void;
  exception: (error: any) => void;
}

export interface SocketData {
  query: WebsocketQuery;
  discriminatorMapping?: DiscriminatorMapping;
}

export interface DiscriminatorMapping {
  key: string;
  value: string;
  isRoot: boolean;
}

export type DbSocket = Socket<ListenMap, EmitMap, DefaultEventsMap, SocketData>;
export type RealtimeMongoEvent =
  | ChangeStreamInsertDocument
  | ChangeStreamUpdateDocument
  | ChangeStreamReplaceDocument
  | ChangeStreamDeleteDocument;

export interface RealtimeMongoSession {
  client: DbSocket;
  query?: FilterQuery<any>;
  document_id?: string;
  document_ids: Set<string>;
}

export abstract class RealtimeEventHandler {
  abstract onChangeEvent(data: RealtimeMongoEvent): void | Promise<void>;
}

export interface CanRealtimeActivate {
  canRealtimeActivate: (socket: Socket) => boolean | Promise<boolean>;
}
