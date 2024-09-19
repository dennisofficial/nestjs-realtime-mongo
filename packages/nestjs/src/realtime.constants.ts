export const REALTIME_CONNECTION = Symbol('realtime:connection');
export const REALTIME_OPTIONS = Symbol('realtime:options');

/**
 * A provider token used to register a global guard for securing WebSocket connections during the handshake phase.
 *
 * **Purpose**:
 * The `REALTIME_GUARD` symbol serves as an injection token that allows you to provide a custom guard implementation
 * specifically for securing the WebSocket handshake in the module's real-time functionality. This is necessary because
 * global NestJS guards (`APP_GUARD`) do not apply to WebSocket handshakes, and `@UseGuards()` in WebSockets only guard
 * message channels, not the handshake itself.
 *
 * **Usage**:
 * - Implement a guard class that implements the `CanRealtimeActivate` interface.
 * - Provide this guard in your module using the `REALTIME_GUARD` token.
 * - The module will use this guard to authenticate and authorize WebSocket clients during the handshake.
 *
 * **Example**:
 * ```typescript
 * // app.module.ts
 * import { Module } from '@nestjs/common';
 * import { REALTIME_GUARD, RealtimeModule } from '@dl-tech/realtime-mongo-nestjs';
 * import { AppGuard } from './app.guard';
 *
 * @Module({
 *   imports: [
 *     RealtimeModule.forRoot({
 *       enableRestApi: true,
 *       enableWebsocket: true,
 *     }),
 *   ],
 *   providers: [
 *     {
 *       provide: APP_GUARD,
 *       useClass: AppGuard,
 *     },
 *     {
 *       provide: REALTIME_GUARD,
 *       useClass: AppGuard,
 *     },
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * **Implementing the Guard**:
 * ```typescript
 * // app.guard.ts
 * import { Injectable } from '@nestjs/common';
 * import { Socket } from 'socket.io';
 * import { CanActivate, ExecutionContext } from '@nestjs/common';
 * import {
 *   CanRealtimeActivate,
 *   isRealtimeDatabase,
 * } from '@dl-tech/realtime-mongo-nestjs';
 *
 * @Injectable()
 * export class AppGuard implements CanActivate, CanRealtimeActivate {
 *   // Guard for REST API and WebSocket message channels
 *   canActivate(context: ExecutionContext): boolean | Promise<boolean> {
 *     if (isRealtimeDatabase(context)) {
 *       // Logic specific to RealtimeDatabase REST endpoints
 *     }
 *     // General authentication logic
 *     return true; // or appropriate logic
 *   }
 *
 *   // Guard for WebSocket handshake
 *   canRealtimeActivate(socket: Socket): boolean | Promise<boolean> {
 *     // Perform authentication and authorization during the handshake
 *     // For example, verify a token from socket.handshake
 *     const token = socket.handshake.auth.token;
 *     if (validateToken(token)) {
 *       return true; // Allow connection
 *     }
 *     return false; // Deny connection
 *   }
 * }
 * ```
 *
 * **Notes**:
 * - The `REALTIME_GUARD` is specifically for guarding the WebSocket handshake phase, which is not covered by standard NestJS guards.
 * - Implementing `CanRealtimeActivate` allows you to define custom authentication and authorization logic during the handshake.
 * - By providing the guard using the `REALTIME_GUARD` token, the module can inject and use your custom guard.
 *
 * **Alternative Method**:
 * - If you prefer to secure WebSocket connections globally, you can extend the `@nestjs/websockets` adapter.
 * - This method secures all WebSocket connections, not just those used by the module.
 *
 * **Important**:
 * - Ensure that your guard class is decorated with `@Injectable()` and implements the `CanRealtimeActivate` interface.
 * - The guard should handle both synchronous and asynchronous validation as needed.
 * - Returning `false` or throwing an exception in `canRealtimeActivate` will prevent the WebSocket connection from being established.
 * - Remember that the `REALTIME_GUARD` is an application-wide provider; you can only have one guard provided with this token.
 */
export const REALTIME_GUARD = Symbol('realtime:guard');

export const METADATA_REALTIME_CONTROLLER = Symbol('realtime:controller');
export const METADATA_CHANGE_STREAM_LISTENER = Symbol('realtime:listener');
export const METADATA_REALTIME_RULE = Symbol('realtime:rule');
export const METADATA_POSTMAN_OPTIONS = Symbol('realtime:postman');
