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
    let canActivate = true;
    const results = await Promise.all(
      this._handlers.map((handler) => handler.canRealtimeActivate(socket)),
    );

    for (const result of results) {
      if (!result) canActivate = false;
    }

    return canActivate;
  }
}
