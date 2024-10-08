import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocumentFromSchema } from 'mongoose';
import { User } from '@/user/user.types';
import { IsNumber, IsString } from 'class-validator';

@Schema({
  discriminatorKey: 'role',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class UserModel extends User {
  @Prop({ required: true })
  @IsString()
  first_name: string;

  @Prop({ required: true })
  @IsString()
  last_name: string;

  @Prop({ required: true })
  @IsString()
  display_name: string;

  @Prop({ required: true })
  @IsNumber()
  age: number;

  @Prop({ type: String })
  user_role: string;

  @Prop()
  signup_date: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserModel);
export type UserDocument = HydratedDocumentFromSchema<typeof UserSchema>;
