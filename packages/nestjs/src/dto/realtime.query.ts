import { IsString } from 'class-validator';

export class RealtimeQuery {
  @IsString()
  modelName: string;
}
