import { ObjectId } from 'mongodb';

export const devalueReducers: Record<string, (value: any) => any> = {
  ObjectId: (value) => value instanceof ObjectId && value.toString(),
};

export const devalueRevivers: Record<string, (value: any) => any> = {
  ObjectId: (value) => ObjectId.createFromHexString(value),
};
