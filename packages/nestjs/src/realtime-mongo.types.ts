import { FilterQuery } from "mongoose";
import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import {
  ChangeStreamDeleteDocument,
  ChangeStreamInsertDocument,
  ChangeStreamReplaceDocument,
  ChangeStreamUpdateDocument,
} from "mongodb";
import { RealtimeMongoQuery } from "./realtime-mongo.query";

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
  query: RealtimeMongoQuery;
  discriminatorMapping?: DiscriminatorMapping;
}

export interface DiscriminatorMapping {
  key: string;
  value: string;
  isRoot: boolean;
}

export type DbSocket = Socket<ListenMap, EmitMap, DefaultEventsMap, SocketData>;
export type DataChange =
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

export interface IRealtimeMongoEventHandler {
  onChangeEvent: (data: DataChange) => void | Promise<void>;
}
