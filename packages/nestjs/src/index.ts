import { RealtimeModule } from './realtime.module';
import type { RealtimeMongoOptions } from './realtime.options';
import {
  CanRealtimeActivate,
  RealtimeEventHandler,
  RealtimeMongoEvent,
} from './realtime.types';
import { ChangeStreamListener } from './decorators/change-stream-listener.decorator';
import { isRealtimeDatabase } from './realtime.utils';
import { REALTIME_GUARD } from './realtime.constants';

export {
  RealtimeModule,
  ChangeStreamListener,
  RealtimeEventHandler,
  isRealtimeDatabase,
  REALTIME_GUARD,
};
export type { RealtimeMongoOptions, RealtimeMongoEvent, CanRealtimeActivate };
