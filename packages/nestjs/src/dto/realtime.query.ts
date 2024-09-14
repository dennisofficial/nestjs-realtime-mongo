import { IsOptional, IsString } from 'class-validator';

export class RealtimeQuery {
  @IsString()
  collection: string;

  @IsOptional()
  @IsString()
  discriminator?: string;
}
