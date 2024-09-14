import { Injectable } from '@nestjs/common';
import { CanRealtimeActivate } from '../realtime.types';
import { Socket } from 'socket.io';

@Injectable()
export class GuardService {
  private _handlers: CanRealtimeActivate[] = [];

  registerHandler(handler: CanRealtimeActivate) {
    this._handlers.push(handler);
  }

  async invokeGuards(socket: Socket) {
    let canActivate = false;
    const results = this._handlers.map((handler) =>
      handler.canRealtimeActivate(socket),
    );

    for (const result of results) {
      if (result instanceof Promise) {
        if (await result) canActivate = true;
      } else {
        if (result) canActivate = true;
      }
    }

    return canActivate;
  }
}
