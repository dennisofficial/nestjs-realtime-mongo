import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocumentFromSchema } from "mongoose";

// It is not required, but recommended to set collection names
@Schema({ collection: "users" })
export class UserModel {
  @Prop({ required: true })
  first_name: string;

  @Prop({ required: true })
  last_name: string;

  @Prop({ required: true })
  age: number;
}

export const UserSchema = SchemaFactory.createForClass(UserModel);
export type UserDocument = HydratedDocumentFromSchema<typeof UserSchema>;
