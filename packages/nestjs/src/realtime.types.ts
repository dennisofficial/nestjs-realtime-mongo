import type { Document, FilterQuery, Model } from 'mongoose';
import type { Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import {
  ChangeStreamDeleteDocument,
  ChangeStreamInsertDocument,
  ChangeStreamReplaceDocument,
  ChangeStreamUpdateDocument,
} from 'mongodb';

export type Return<F> = F extends () => Promise<infer R> ? R : never;

export interface ListenMap {
  query: (data: FilterQuery<any>) => void;
  document: (data: { _id: string }) => void;
}

export interface EmitMap {
  data: (data: Record<string, any>[] | Record<string, any>) => void;
  update: (data: { _id: string; data?: Record<string, any> }) => void;
  remove: (data: { _id: string }) => void;
  add: (data: { _id: string; data?: Record<string, any> }) => void;
  exception: (error: any) => void;
}

export interface SocketData {
  model: Model<Record<string, any>>;
  filter: FilterQuery<Record<string, any>>;
  isDocument: boolean;
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
  document_ids: Set<string>;
}

export abstract class RealtimeEventHandler {
  abstract onChangeEvent(data: RealtimeMongoEvent): void | Promise<void>;
}

export abstract class RealtimeRuleGuard<
  U extends Record<string, any>,
  D extends Document,
> {
  abstract canCreate(
    user: U | null,
  ): FilterQuery<D> | Promise<FilterQuery<D> | boolean> | boolean;
  abstract canRead(
    user: U | null,
  ): FilterQuery<D> | Promise<FilterQuery<D> | boolean> | boolean;
  abstract canUpdate(
    user: U | null,
  ): FilterQuery<D> | Promise<FilterQuery<D> | boolean> | boolean;
  abstract canDelete(
    user: U | null,
  ): FilterQuery<D> | Promise<FilterQuery<D> | boolean> | boolean;
}

export interface CanRealtimeActivate {
  canRealtimeActivate: (socket: Socket) => boolean | Promise<boolean>;
}
