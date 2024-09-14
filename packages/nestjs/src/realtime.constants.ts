export const REALTIME_CONNECTION = Symbol('realtime:connection');
export const REALTIME_OPTIONS = Symbol('realtime:options');
export const REALTIME_GUARD = Symbol('realtime:guard');

export const METADATA_REALTIME_CONTROLLER = Symbol('realtime:controller');
export const METADATA_CHANGE_STREAM_LISTENER = Symbol('realtime:listener');
export const METADATA_REALTIME_RULE = Symbol('realtime:rule');

export enum ERealtimeError {
  RULE_FAILED = 'You do not have access',
}
