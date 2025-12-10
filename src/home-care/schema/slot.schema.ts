import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type SlotDocument = Slot & Document;

@Schema()
export class Slot {
  @Prop({ type: MongooseSchema.Types.ObjectId, auto: true })
  _id?: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  label: string; // e.g. "15min", "30min", "1 hour"

  @Prop({ required: true })
  durationInMinutes: number;

  @Prop({ default: true })
  active: boolean;

  @Prop()
  createdAt?: Date;

  @Prop({ required: true })
  start: Date;

  @Prop({ required: true })
  end: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Service', required: true })
  serviceId: Types.ObjectId;
}

export const SlotSchema = SchemaFactory.createForClass(Slot);
