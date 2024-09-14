import { DynamicModule, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RealtimeController } from './realtime.controller';
import { StreamService } from './services/stream.service';
import { SessionService } from './services/session.service';
import { RealtimeService } from './services/realtime.service';
import { RealtimeGateway } from './realtime.gateway';
import {
  REALTIME_MONGO_DB_CONNECTION,
  REALTIME_MONGO_OPTIONS,
} from './realtime.constants';
import type { RealtimeMongoOptions } from './realtime.options';
import { EventService } from './services/event.service';
import { DiscoveryModule } from '@nestjs/core';
import { ExplorerService } from './services/explorer.service';

export class RealtimeModule implements OnModuleInit {
  private logger = new Logger(this.constructor.name);

  static forRoot<User extends Record<string, any> | undefined>(
    options: RealtimeMongoOptions<User>,
  ): DynamicModule {
    const module: Required<DynamicModule> = {
      global: false,
      module: RealtimeModule,
      imports: [DiscoveryModule],
      controllers: [],
      providers: [
        RealtimeService,
        ExplorerService,
        EventService,
        StreamService,
        SessionService,
        {
          provide: REALTIME_MONGO_OPTIONS,
          useValue: options,
        },
        {
          provide: REALTIME_MONGO_DB_CONNECTION,
          useExisting: options.connectionToken ?? getConnectionToken(),
        },
      ],
      exports: [],
    };

    if (options.imports) {
      module.imports.push(...options.imports);
    }

    if (options.enableRestApi) {
      module.controllers.push(RealtimeController);
    }

    if (options.enableWebsocket) {
      module.providers.push(RealtimeGateway);
    }

    return module;
  }

  constructor(
    @Inject(REALTIME_MONGO_DB_CONNECTION) private readonly conn: Connection,
    @Inject(REALTIME_MONGO_OPTIONS)
    private readonly options: RealtimeMongoOptions,
  ) {}

  onModuleInit = async () => {
    // Validate Validation hashMap
    if (this.options.validation) {
      Object.values(this.conn.models).forEach((model) => {
        const validationExists =
          !!this.options.validation?.classValidators[model.modelName];
        if (!validationExists) {
          this.logger.warn(
            `Model Name: ${model.modelName} validation schema doesn't exist`,
          );
        }
      });
    }
  };
}
