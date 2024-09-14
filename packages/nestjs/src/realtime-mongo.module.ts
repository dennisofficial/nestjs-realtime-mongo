import {
  DynamicModule,
  Inject,
  Logger,
  ModuleMetadata,
  OnModuleInit,
  Provider,
  Type,
} from "@nestjs/common";
import { getConnectionToken } from "@nestjs/mongoose";
import { Request } from "express";
import { ValidationOptions } from "class-validator";
import { Socket } from "socket.io";
import { Connection } from "mongoose";
import { IRealtimeMongoEventHandler } from "./realtime-mongo.types";
import { RealtimeMongoController } from "./realtime-mongo.controller";
import { RealtimeStreamService } from "./realtime-stream.service";
import { RealtimeSessionService } from "./realtime-session.service";
import { RealtimeMongoService } from "./realtime-mongo.service";
import { RealtimeMongoGateway } from "./realtime-mongo.gateway";
import {
  REALTIME_MONGO_DB_CONNECTION,
  REALTIME_MONGO_EVENT_HANDLER,
  REALTIME_MONGO_OPTIONS,
} from "./realtime-mongo.constants";

export interface RealtimeMongoOptions<
  User extends Record<string, any> | undefined = any,
> {
  /**
   * Any modules needed to be imported for the injectable dependencies.
   */
  imports?: ModuleMetadata["imports"];
  /**
   * The @nestjs/mongoose connectionToken
   * @default require('@nestjs/mongoose').getConnectionToken()
   */
  connectionToken?: string;
  /**
   * An injectable class to call whenever a change stream is received.
   */
  eventHandler?: Provider<IRealtimeMongoEventHandler>;
  /**
   * Emits change events to `@nestjs/event-emitter` package, for the application to handle server side changes.
   * @default false
   */
  enableEventEmitter?: boolean;
  /**
   * Enables the `@nestjs/websockets` Gateway for client devices to recieve realtime data.
   * @default false
   */
  enableWebsocket?: boolean;
  /**
   * Enables the `@Controller` for client devices to access the REST API.
   * @default false
   */
  enableRestApi?: boolean;
  /**
   * Without this, client devices essentially using REST or WS has access to all documents.
   */
  accessGuard?: {
    /**
     * A function the module can use to extract the user context from the request for you.
     */
    extractUserRest?: (req: Request) => User | Promise<User>;
    /**
     * A function the module can use to extract the user context from the websocket handshake for you.
     */
    extractUserWS?: (req: Readonly<Socket>) => User | Promise<User>;
  };
  validation?: {
    /**
     * A hashMap for the module to use to run type validations. This also works for discriminators.
     *
     * The keys of the hashMap should be the name of the model schemas, this is usually from the `name` property:
     * ```
     * MongooseModule.forFeature([
     *   {
     *     name: UserModel.name,
     *     schema: UserSchema,
     *     discriminators: [{ value: 'Admin', name: AdminUserModel.name, schema: AdminUserSchema }],
     *   },
     * ]);
     * ```
     *
     * @example
     * {
     *   [UserModel.name]: UserDto,
     *   [AdminUserModel.name]: AdminUserDto,
     * }
     */
    classValidators: Record<string, Type>;
    /**
     * Validation Options to use
     */
    validationOptions?: ValidationOptions;
  };
}

export class RealtimeMongoModule implements OnModuleInit {
  private logger = new Logger(this.constructor.name);

  static register<User extends Record<string, any> | undefined>(
    options: RealtimeMongoOptions<User>,
  ): DynamicModule {
    const module: DynamicModule = {
      module: RealtimeMongoModule,
      imports: [],
      controllers: [],
      providers: [
        RealtimeMongoService,
        RealtimeStreamService,
        {
          provide: RealtimeSessionService,
          useClass: RealtimeSessionService,
        },
        {
          provide: REALTIME_MONGO_OPTIONS,
          useValue: options,
        },
        {
          provide: REALTIME_MONGO_DB_CONNECTION,
          useExisting: options.connectionToken ?? getConnectionToken(),
        },
      ],
    };

    if (options.imports) {
      module.imports?.push(...options.imports);
    }

    if (options.enableRestApi) {
      module.controllers?.push(RealtimeMongoController);
    }

    if (options.enableWebsocket) {
      module.providers?.push(RealtimeMongoGateway);
    }

    if (options.eventHandler) {
      module.providers?.push(options.eventHandler);
      module.providers?.push({
        provide: REALTIME_MONGO_EVENT_HANDLER,
        useExisting:
          typeof options.eventHandler === "object"
            ? options.eventHandler.provide
            : options.eventHandler,
      });
    } else {
      module.providers?.push({
        provide: REALTIME_MONGO_EVENT_HANDLER,
        useValue: undefined,
      });
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
