import { RealtimeRestClient } from '@dl-tech/realtime-mongo-client';

class User {
  first_name!: string;
  last_name!: string;
  display_name!: string;
  age!: number;
}

type ModelMap = {
  UserModel: User
}

export const databaseRest = new RealtimeRestClient<ModelMap>({
  baseURL: 'http://localhost:4000'
})