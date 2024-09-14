import { Injectable, OnModuleInit } from '@nestjs/common';
import { RealtimeEventHandler, RealtimeMongoEvent } from '../realtime.types';
import { ExplorerService } from './explorer.service';
import { METADATA_CHANGE_STREAM_LISTENER } from '../realtime.constants';
import { Reflector } from '@nestjs/core';

@Injectable()
export class EventService implements OnModuleInit {
  private _handlers: RealtimeEventHandler[] = [];

  constructor(
    private readonly explorerService: ExplorerService,
    private readonly reflector: Reflector,
  ) {}

  onModuleInit = () => {
    const providers = this.explorerService.findProviders((target) => {
      return this.reflector.get(METADATA_CHANGE_STREAM_LISTENER, target);
    });

    for (const provider of providers) {
      if (!(provider.instance instanceof RealtimeEventHandler)) {
        throw new Error(
          `${provider.name} needs to extend ${RealtimeEventHandler.name}`,
        );
      }

      this.registerHandler(provider.instance);
    }
  };

  registerHandler(handler: RealtimeEventHandler) {
    this._handlers.push(handler);
  }

  invokeHandlers(data: RealtimeMongoEvent) {
    this._handlers.forEach((handler) => handler.onChangeEvent(data));
  }
}
