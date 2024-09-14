import { applyDecorators, Injectable, SetMetadata, Type } from '@nestjs/common';
import { METADATA_REALTIME_RULE } from '../realtime.constants';

export const RealtimeRule = (model: Type) =>
  applyDecorators(SetMetadata(METADATA_REALTIME_RULE, model.name), Injectable);
