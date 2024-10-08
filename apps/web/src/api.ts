import { plainToInstance, Transform } from 'class-transformer';
import { initializeRealtimeMongo } from '@dl-tech/realtime-mongo-client';

export class BaseMongo {
  _id!: string;
  __v!: number;

  @Transform(({ value }) => new Date(value))
  created_at!: Date;

  @Transform(({ value }) => new Date(value))
  updated_at!: Date;
}

export class User extends BaseMongo {
  first_name!: string;
  last_name!: string;
  display_name!: string;
  age!: number;
}

export class Admin extends User {
  power_level!: number;
}

export type ModelMap = {
  UserModel: User;
  AdminUserModel: Admin;
};

export const { databaseSocket, databaseRest } = initializeRealtimeMongo<
  ModelMap,
  BaseMongo
>({
  baseURL: 'http://localhost:4000',
  wsAuth: () => {
    // This function is for the Auth Object in socket.io. Use this to authenticate your users.
    return {
      id_token: 'eyzasdfasf...',
    };
  },
  deserializers: {
    UserModel: (data: any): User => plainToInstance(User, data),
    AdminUserModel: (data: any): Admin => plainToInstance(Admin, data),
  },
});
