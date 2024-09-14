import { Injectable } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';

@Injectable()
export class ExplorerService {
  constructor(private readonly discoveryService: DiscoveryService) {}

  findProviders = (
    filterFn: (token: any, wrapper: InstanceWrapper) => boolean,
  ) => {
    return this.discoveryService.getProviders().filter((wrapper) => {
      const target = this.getTarget(wrapper);

      if (!target) return false;

      return filterFn(target, wrapper);
    });
  };

  getTarget = (wrapper: InstanceWrapper) =>
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
    !wrapper.metatype || wrapper.inject
      ? wrapper.instance?.constructor
      : wrapper.metatype;
}
