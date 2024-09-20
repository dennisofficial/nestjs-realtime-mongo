import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { IsNumber } from "class-validator";
import { HydratedDocumentFromSchema } from "mongoose";
import { AdminUser } from "@/user/admin-user.types";

@Schema()
export class AdminUserModel extends AdminUser {
  @Prop({ required: true })
  @IsNumber()
  power_level: number;
}

export const AdminUserSchema = SchemaFactory.createForClass(AdminUserModel);
export type AdminUserDocument = HydratedDocumentFromSchema<
  typeof AdminUserSchema
>;
