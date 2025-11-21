import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { UserType } from '../../common/enums';

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop({ type: MongooseSchema.Types.ObjectId, auto: true })
  _id?: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  email: string;

  @Prop()
  phone: string;

  @Prop()
  password?: string;

  @Prop()
  dob?: Date;

  @Prop()
  age?: number;

  @Prop({ type: String, enum: UserType, required: true })
  type: UserType;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Hospitals',
    required: true,
  })
  tenantId?: MongooseSchema.Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);
