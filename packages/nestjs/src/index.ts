import { RealtimeModule } from './realtime.module';
import type { RealtimeMongoOptions } from './realtime.options';
import {
  CanRealtimeActivate,
  RealtimeEventHandler,
  RealtimeMongoEvent,
  RealtimeRuleGuard,
} from './realtime.types';
import { ChangeStreamListener } from './decorators/change-stream-listener.decorator';
import { RealtimeRule } from './decorators/realtime-rule.decorator';
import { isRealtimeDatabase } from './realtime.utils';
import { REALTIME_GUARD } from './realtime.constants';

export {
  RealtimeRule,
  RealtimeRuleGuard,
  RealtimeModule,
  ChangeStreamListener,
  RealtimeEventHandler,
  isRealtimeDatabase,
  REALTIME_GUARD,
};
export type { RealtimeMongoOptions, RealtimeMongoEvent, CanRealtimeActivate };
