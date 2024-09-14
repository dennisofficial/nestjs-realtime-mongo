import { TransformDate } from "@/transformers/date.transformer";

export class BaseMongo {
  _id!: string;
  __v!: number;

  @TransformDate()
  created_at!: Date;

  @TransformDate()
  updated_at!: Date;
}
