import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { METADATA_CHANGE_STREAM_LISTENER } from '../realtime.constants';
import { RealtimeEventHandler } from '../realtime.types';
import { EventService } from './event.service';

@Injectable()
export class ExplorerService implements OnModuleInit {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly eventService: EventService,
  ) {}

  onModuleInit = () => {
    const providers = this.discoveryService.getProviders().filter((wrapper) => {
      // NOTE: Regarding the ternary statement below,
      // - The condition `!wrapper.metatype` is because when we use `useValue`
      // the value of `wrapper.metatype` will be `null`.
      // - The condition `wrapper.inject` is needed here because when we use
      // `useFactory`, the value of `wrapper.metatype` will be the supplied
      // factory function.
      // For both cases, we should use `wrapper.instance.constructor` instead
      // of `wrapper.metatype` to resolve processor's class properly.
      // But since calling `wrapper.instance` could degrade overall performance
      // we must defer it as much we can. But there's no other way to grab the
      // right class that could be annotated with `@ChangeStreamListener()`
      // decorator without using this property.
      const target =
        !wrapper.metatype || wrapper.inject
          ? wrapper.instance?.constructor
          : wrapper.metatype;

      if (!target) return false;

      return this.reflector.get(METADATA_CHANGE_STREAM_LISTENER, target);
    });

    // Validate all providers and register
    for (const provider of providers) {
      if (!(provider.instance instanceof RealtimeEventHandler)) {
        throw new Error(
          `${provider.name} needs to extend ${RealtimeEventHandler.name}`,
        );
      }
      this.eventService.registerHandler(provider.instance);
    }
  };
}
