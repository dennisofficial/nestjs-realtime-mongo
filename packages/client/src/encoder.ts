export const devalueReducers: Record<string, (value: any) => any> = {};

export const devalueRevivers: Record<string, (value: any) => any> = {
  ObjectId: (value) => value,
};
