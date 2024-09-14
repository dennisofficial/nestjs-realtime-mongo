import { Injectable } from '@nestjs/common';
import { RealtimeEventHandler, RealtimeMongoEvent } from '../realtime.types';

@Injectable()
export class EventService {
  private _handlers: RealtimeEventHandler[] = [];

  registerHandler(handler: RealtimeEventHandler) {
    this._handlers.push(handler);
  }

  invokeHandlers(data: RealtimeMongoEvent) {
    this._handlers.forEach((handler) => handler.onChangeEvent(data));
  }
}
