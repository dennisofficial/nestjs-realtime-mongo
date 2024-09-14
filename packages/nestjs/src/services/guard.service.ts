import { Injectable, OnModuleInit } from '@nestjs/common';
import { CanRealtimeActivate } from '../realtime.types';
import { Socket } from 'socket.io';
import { ExplorerService } from './explorer.service';
import { REALTIME_GUARD } from '../realtime.constants';

@Injectable()
export class GuardService implements OnModuleInit {
  private _handlers: CanRealtimeActivate[] = [];

  constructor(private readonly explorerService: ExplorerService) {}

  onModuleInit = () => {
    const providers = this.explorerService.findProviders((_, wrapper) => {
      return wrapper.token === REALTIME_GUARD;
    });

    // Validate all guards and register
    for (const guard of providers) {
      const key: keyof CanRealtimeActivate = 'canRealtimeActivate';
      if (
        !(key in guard.instance) ||
        typeof guard.instance[key] !== 'function'
      ) {
        throw new Error(`${guard.name} needs to have method ${key}`);
      }

      this.registerHandler(guard.instance);
    }
  };

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
