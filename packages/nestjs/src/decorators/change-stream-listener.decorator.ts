import { applyDecorators, Injectable, SetMetadata } from '@nestjs/common';
import { METADATA_CHANGE_STREAM_LISTENER } from '../realtime.constants';

/**
 * Decorator that marks a class as a listener for MongoDB Change Stream events.
 *
 * **Purpose**:
 * Applying the `@ChangeStreamListener()` decorator to a class registers it to receive
 * MongoDB Change Stream events such as `insert`, `update`, `replace`, and `delete`.
 * This allows the class to handle real-time database changes on the server side.
 *
 * **Usage**:
 * - Decorate a class that extends `RealtimeEventHandler` with `@ChangeStreamListener()`.
 * - Implement the `onChangeEvent` method to handle the incoming change events.
 *
 * **Example**:
 * ```typescript
 * import {
 *   ChangeStreamListener,
 *   RealtimeEventHandler,
 *   RealtimeMongoEvent,
 * } from "@dl-tech/realtime-mongo-nestjs";
 *
 * @ChangeStreamListener()
 * export class DatabaseEventService extends RealtimeEventHandler {
 *   async onChangeEvent(data: RealtimeMongoEvent) {
 *     // Do something with the change event data
 *   }
 * }
 * ```
 *
 * **Notes**:
 * - The decorator internally applies `@Injectable()` and sets metadata to identify the class as a Change Stream listener.
 * - Only specific MongoDB events are listened to: [Insert](https://www.mongodb.com/docs/manual/reference/change-events/insert/),
 *   [Update](https://www.mongodb.com/docs/manual/reference/change-events/update/),
 *   [Replace](https://www.mongodb.com/docs/manual/reference/change-events/replace/), and
 *   [Delete](https://www.mongodb.com/docs/manual/reference/change-events/delete/).
 * - Ensure that the class is provided in your module so that it gets instantiated by the NestJS dependency injection system.
 */
export const ChangeStreamListener = () =>
  applyDecorators(
    SetMetadata(METADATA_CHANGE_STREAM_LISTENER, true),
    Injectable,
  );
