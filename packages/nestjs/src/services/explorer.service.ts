import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import {
  METADATA_CHANGE_STREAM_LISTENER,
  REALTIME_GUARD,
} from '../realtime.constants';
import { CanRealtimeActivate, RealtimeEventHandler } from '../realtime.types';
import { EventService } from './event.service';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { GuardService } from './guard.service';

@Injectable()
export class ExplorerService implements OnModuleInit {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly eventService: EventService,
    private readonly guardService: GuardService,
  ) {}

  onModuleInit = () => {
    const eventHandlers: InstanceWrapper[] = [];
    const guards: InstanceWrapper[] = [];

    this.discoveryService.getProviders().forEach((wrapper) => {
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

      if (this.reflector.get(METADATA_CHANGE_STREAM_LISTENER, target)) {
        eventHandlers.push(wrapper);
        return;
      }

      if (wrapper.token === REALTIME_GUARD) {
        guards.push(wrapper);
        return;
      }
    });

    // Validate all providers and register
    for (const provider of eventHandlers) {
      if (!(provider.instance instanceof RealtimeEventHandler)) {
        throw new Error(
          `${provider.name} needs to extend ${RealtimeEventHandler.name}`,
        );
      }
      this.eventService.registerHandler(provider.instance);
    }

    // Validate all guards and register
    for (const guard of guards) {
      const key: keyof CanRealtimeActivate = 'canRealtimeActivate';
      if (
        !(key in guard.instance) ||
        typeof guard.instance[key] !== 'function'
      ) {
        throw new Error(`${guard.name} needs to have method ${key}`);
      }
      this.guardService.registerHandler(guard.instance);
    }
  };
}
