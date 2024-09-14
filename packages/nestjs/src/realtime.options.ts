import { ModuleMetadata, Provider, Type } from '@nestjs/common';
import { RealtimeEventHandler } from './realtime.types';
import { Request } from 'express';
import { Socket } from 'socket.io';
import { ValidationOptions } from 'class-validator';

export interface RealtimeMongoOptions<
  User extends Record<string, any> | undefined = any,
> {
  /**
   * Any modules needed to be imported for the injectable dependencies.
   */
  imports?: ModuleMetadata['imports'];
  /**
   * The @nestjs/mongoose connectionToken
   * @default require('@nestjs/mongoose').getConnectionToken()
   */
  connectionToken?: string;
  /**
   * An injectable class to call whenever a change stream is received.
   */
  eventHandler?: Provider<RealtimeEventHandler>;
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
