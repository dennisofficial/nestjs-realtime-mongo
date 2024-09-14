import { IsOptional, IsString } from 'class-validator';

export class RealtimeMongoQuery {
  @IsString()
  collection: string;

  @IsOptional()
  @IsString()
  discriminator?: string;
}
