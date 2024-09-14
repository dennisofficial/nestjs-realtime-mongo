import { BaseMongo } from "@/types/mongo";

export class User extends BaseMongo {
  first_name: string;
  last_name: string;
  display_name: string;
  age: number;
}
