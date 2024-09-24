import { Injectable, OnModuleInit } from '@nestjs/common';
import { RealtimeRuleGuard } from '../realtime.types';
import { ExplorerService } from './explorer.service';
import { METADATA_REALTIME_RULE } from '../realtime.constants';
import { Reflector } from '@nestjs/core';
import { FilterQuery } from 'mongoose';

@Injectable()
export class RuleService implements OnModuleInit {
  private _rules = new Map<string, RealtimeRuleGuard<any, any>>();

  constructor(
    private readonly explorerService: ExplorerService,
    private readonly reflector: Reflector,
  ) {}

  onModuleInit = () => {
    const providers = this.explorerService.findProviders((target) => {
      return this.reflector.get(METADATA_REALTIME_RULE, target);
    });

    for (const provider of providers) {
      if (!(provider.instance instanceof RealtimeRuleGuard)) {
        throw new Error(
          `${provider.name} needs to extend ${RealtimeRuleGuard.name}`,
        );
      }

      const target = this.explorerService.getTarget(provider);

      const modelName = this.reflector.get(METADATA_REALTIME_RULE, target);

      this.registerRule(modelName, provider.instance);
    }
  };

  registerRule = (modelName: string, guard: RealtimeRuleGuard<any, any>) => {
    this._rules.set(modelName, guard);
  };

  invokeRules = async (
    modelName: string,
    user: any | null,
    operation: keyof RealtimeRuleGuard<any, any>,
  ): Promise<FilterQuery<Record<string, any>> | boolean> => {
    const guard = this._rules.get(modelName);

    if (!guard) {
      return true;
    }

    return guard[operation](user);
  };
}
