import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocumentFromSchema } from "mongoose";
import { User } from "@/user/user.types";

@Schema({ collection: "users" })
export class UserModel extends User {
  @Prop({ required: true })
  first_name: string;

  @Prop({ required: true })
  last_name: string;

  @Prop({ required: true })
  display_name: string;

  @Prop({ required: true })
  age: number;
}

export const UserSchema = SchemaFactory.createForClass(UserModel);
export type UserDocument = HydratedDocumentFromSchema<typeof UserSchema>;
