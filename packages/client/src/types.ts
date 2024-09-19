import { FilterQuery, UpdateQuery } from 'mongoose';

export interface ObjectIdDto {
  _id: string;
}

export interface FilterDto<T extends Record<string, any>> {
  filter: FilterQuery<T>;
}

export interface DataSingleDto<T extends Record<string, any>> {
  data: T;
}

export interface DataArrayDto<T extends Record<string, any>> {
  data: T[];
}

export interface UpdateIdDto<T extends Record<string, any>> {
  _id: string;
  update: UpdateQuery<T>;
}

export interface UpdateDto<T extends Record<string, any>> {
  filter: FilterQuery<T>;
  update: UpdateQuery<T>;
}
