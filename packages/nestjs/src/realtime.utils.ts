import { ExecutionContext } from '@nestjs/common';
import { METADATA_REALTIME_CONTROLLER } from './realtime.constants';

export const isRealtimeDatabase = (context: ExecutionContext): boolean => {
  const clazz = context.getClass();
  return Reflect.getMetadata(METADATA_REALTIME_CONTROLLER, clazz) ?? false;
};
