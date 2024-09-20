import { IsObject, IsString, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { FilterQuery } from 'mongoose';

export class RealtimeQuery {
  @IsString()
  modelName: string;
}

export class RealtimeSocketOptions {
  @IsString()
  modelName: string;

  @IsString()
  @ValidateIf(({ filter }) => !filter)
  _id?: string;

  @IsObject({ each: false })
  @ValidateIf(({ _id }) => !_id)
  filter?: FilterQuery<any>;
}

export class RealtimeAuthDto {
  @IsObject({ each: false })
  @Type(() => RealtimeSocketOptions)
  _realtime: RealtimeSocketOptions;
}
