import { IsOptional, IsString } from "class-validator";

export class WebsocketQuery {
  @IsString()
  collection: string;

  @IsOptional()
  @IsString()
  discriminator?: string;
}
