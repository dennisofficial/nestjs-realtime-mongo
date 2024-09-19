import { IsArray, IsObject, IsString } from 'class-validator';
import { FilterQuery, UpdateQuery } from 'mongoose';

export class ObjectIdDto {
  @IsString()
  _id: string;
}

export class FilterDto {
  @IsObject({ each: false })
  filter: FilterQuery<any>;
}

export class DataSingleDto {
  @IsObject({ each: false })
  data: any;
}

export class DataArrayDto {
  @IsArray()
  @IsObject({ each: true })
  data: any[];
}

export class UpdateIdDto {
  @IsString()
  _id: string;

  @IsObject({ each: false })
  update: UpdateQuery<any>;
}

export class UpdateDto {
  @IsObject({ each: false })
  filter: FilterQuery<any>;

  @IsObject({ each: false })
  update: UpdateQuery<any>;
}

export class ReplaceDto {
  @IsObject({ each: false })
  filter: FilterQuery<any>;

  @IsObject({ each: false })
  replace: UpdateQuery<any>;
}
