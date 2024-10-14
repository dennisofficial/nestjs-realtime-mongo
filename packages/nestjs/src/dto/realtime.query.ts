import {
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
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
  @IsOptional()
  _id?: string;

  @IsObject({ each: false })
  @IsOptional()
  filter?: FilterQuery<any>;
}

export class RealtimeAuthDto {
  @IsObject({ each: false })
  @ValidateNested()
  @Type(() => RealtimeSocketOptions)
  _realtime: RealtimeSocketOptions;
}
