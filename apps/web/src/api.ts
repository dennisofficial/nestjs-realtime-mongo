import 'reflect-metadata';
import {
  RealtimeRestClient,
  RealtimeSocketClient,
} from '@dl-tech/realtime-mongo-client';

class User {
  first_name!: string;
  last_name!: string;
  display_name!: string;
  age!: number;
}

class Admin extends User {
  power_level!: number;
}

type ModelMap = {
  UserModel: User;
  AdminUserModel: Admin;
};

export const databaseRest = new RealtimeRestClient<ModelMap>({
  baseURL: 'http://localhost:4000',
});

export const databaseSocket = new RealtimeSocketClient<ModelMap>({
  baseURL: 'http://localhost:4000',
});
