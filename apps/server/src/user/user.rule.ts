import {
  RealtimeRule,
  RealtimeRuleGuard,
} from "@dl-tech/realtime-mongo-nestjs";
import { UserDocument, UserModel } from "@/user/user.model";
import { User } from "@/user/user.types";
import { FilterQuery } from "mongoose";
import { ObjectId } from "mongodb";

@RealtimeRule(UserModel)
export class UserRule extends RealtimeRuleGuard<User, UserDocument> {
  // No authenticated users can create a user
  canCreate(user: User | null): FilterQuery<UserDocument> | boolean {
    if (!user) return false;

    return {
      display_name: {
        $exists: true,
        $type: "string",
        $regex: /^.{6,}$/,
      },
    };
  }

  // Only authenticated user can read itself
  canRead(user: User | null): FilterQuery<UserDocument> | boolean {
    if (!user) return false;

    return {
      _id: new ObjectId(user._id),
    };
  }

  // Only authenticated user can update itself
  canUpdate(user: User | null): FilterQuery<UserDocument> | boolean {
    if (!user) return false;

    return {
      // _id: new ObjectId(user._id),
      age: {
        $lte: 5,
      },
    };
  }

  // No authenicated user can delete
  canDelete(user: User | null): boolean {
    return false;
  }
}
