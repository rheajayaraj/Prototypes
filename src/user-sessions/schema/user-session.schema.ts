import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';
import { Status } from '../../common/enums';
import { Hospital } from '../../general/schemas/hospital.schema';

export type UserSessionDocument = UserSession & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class UserSession {
  @Prop({ type: MongooseSchema.Types.ObjectId, auto: true })
  _id?: MongooseSchema.Types.ObjectId;

  @Prop()
  more_info: string;

  @Prop()
  socket_id: string;

  @Prop({ required: false })
  fcm_token?: string;

  @Prop({ required: false })
  device_token?: string;

  @Prop({ required: false })
  device_type?: string;

  @Prop()
  access_token: string;

  @Prop()
  refresh_token: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Hospital.name })
  tenant: Types.ObjectId;

  @Prop()
  expiry_at: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  user_id: Types.ObjectId;

  @Prop({ required: true, default: Status.ACTIVE })
  status: Status;

  @Prop()
  createdAt: Date;
}

export const UserSessionSchema = SchemaFactory.createForClass(UserSession);
