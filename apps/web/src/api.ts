import { Transform } from 'class-transformer';
import { initializeRealtimeMongo } from '@dl-tech/realtime-mongo-client';

export class BaseMongo {
  _id!: string;
  __v!: number;

  @Transform(({ value }) => new Date(value))
  created_at!: Date;

  @Transform(({ value }) => new Date(value))
  updated_at!: Date;
}

class User extends BaseMongo {
  first_name!: string;
  last_name!: string;
  display_name!: string;
  age!: number;
}

class Admin extends User {
  power_level!: number;
}

export const { databaseSocket, databaseRest } = initializeRealtimeMongo(
  { baseURL: 'http://localhost:4000' },
  {
    UserModel: User,
    AdminUserModel: Admin,
  },
);
