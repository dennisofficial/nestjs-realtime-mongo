import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { UserModel, UserSchema } from "@/user/user.model";
import { UserRule } from "@/user/user.rule";
import { AdminUserModel, AdminUserSchema } from "@/user/admin-user.model";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: UserModel.name,
        schema: UserSchema,
        collection: "users",
        discriminators: [
          {
            value: "Admin",
            schema: AdminUserSchema,
            name: AdminUserModel.name,
          },
        ],
      },
    ]),
  ],
  providers: [UserRule],
})
export class UserModule {}
