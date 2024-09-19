import { applyDecorators, Injectable, SetMetadata, Type } from '@nestjs/common';
import { METADATA_REALTIME_RULE } from '../realtime.constants';

/**
 * Decorator that registers a class as an access control rule for a specific model.
 *
 * **Purpose**:
 * The `@RealtimeRule(modelType)` decorator is used to define access control rules for a particular Mongoose model.
 * By applying this decorator to a class, you instruct the module to use the class as an access guard for the specified model.
 * This allows you to limit what resources users have access to by defining custom authorization logic.
 *
 * **Parameters**:
 * - `model`: The class used to create the `@nestjs/mongoose` schema. This should be the model class associated with the Mongoose schema you want to protect.
 *
 * **Usage**:
 * - Create a class that extends `RealtimeRuleGuard`, providing the appropriate generic types for your authenticated user type and the MongoDB `Document` type.
 * - Apply the `@RealtimeRule(modelType)` decorator to the class, passing in the model class.
 * - Implement the `canCreate`, `canRead`, `canUpdate`, and `canDelete` methods to define your authorization logic.
 *
 * **Example**:
 * ```typescript
 * // user.rule.ts
 * import {
 *   RealtimeRule,
 *   RealtimeRuleGuard,
 * } from "@dl-tech/realtime-mongo-nestjs";
 * import { UserDocument, UserModel } from "./user/user.model";
 * import { User } from "./user/user.types";
 * import { FilterQuery } from "mongoose";
 * import { ObjectId } from "mongodb";
 *
 * @RealtimeRule(UserModel)
 * export class UserRule extends RealtimeRuleGuard<User, UserDocument> {
 *   // No unauthenticated users can create a user
 *   canCreate(user: User | null): FilterQuery<UserDocument> | boolean {
 *     if (!user) return false;
 *     return false;
 *   }
 *
 *   // Only authenticated users can read themselves
 *   canRead(user: User | null): FilterQuery<UserDocument> | boolean {
 *     if (!user) return false;
 *     return {
 *       _id: new ObjectId(user._id),
 *     };
 *   }
 *
 *   // Only authenticated users can update themselves
 *   canUpdate(user: User | null): FilterQuery<UserDocument> | boolean {
 *     if (!user) return false;
 *     return {
 *       _id: new ObjectId(user._id),
 *     };
 *   }
 *
 *   // No authenticated user can delete
 *   canDelete(user: User | null): boolean {
 *     return false;
 *   }
 * }
 * ```
 *
 * **Notes**:
 * - The class must extend `RealtimeRuleGuard` with two generic types:
 *   - The first generic type is your authenticated user type used throughout your application.
 *   - The second generic type is the MongoDB `Document` type for the model, to assist with `FilterQuery` auto-completion.
 * - The `canCreate`, `canRead`, `canUpdate`, and `canDelete` methods define the authorization logic:
 *   - Return `false` to immediately deny access and throw a `ForbiddenException`.
 *   - Return a `FilterQuery` to limit the client's query to specific documents, merging with any filters provided by the client.
 * - This mechanism ensures that clients can only access or modify documents they are authorized to, without needing to implement authorization logic on the client side.
 *
 * **Example Scenario**:
 * If you have a `Post` model with an `owner_id` field, and you want to ensure that users can only update their own posts:
 * ```typescript
 * @RealtimeRule(PostModel)
 * export class PostRule extends RealtimeRuleGuard<User, PostDocument> {
 *   canUpdate(user: User | null): FilterQuery<PostDocument> | boolean {
 *     if (!user) return false;
 *     return {
 *       owner_id: new ObjectId(user._id),
 *     };
 *   }
 * }
 * ```
 * When a client attempts to update a post, the module will use the `canUpdate` rule to filter the operation, ensuring that the user can only update posts where `owner_id` matches their own ID.
 *
 * **Important**:
 * - Ensure that the rule classes are provided in your module so they are recognized by the NestJS dependency injection system.
 * - The decorator internally applies `@Injectable()` and sets metadata to register the class as a Realtime Rule.
 */
export const RealtimeRule = (model: Type) =>
  applyDecorators(SetMetadata(METADATA_REALTIME_RULE, model.name), Injectable);
