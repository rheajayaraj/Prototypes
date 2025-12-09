import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type ServiceDocument = Service & Document;

@Schema()
export class Service {
  @Prop({ type: MongooseSchema.Types.ObjectId, auto: true })
  _id?: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  // GeoJSON point
  @Prop({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], index: '2dsphere' as any }, // [lng, lat]
  })
  location: { type: string; coordinates: number[] };

  @Prop({ type: [Types.ObjectId], ref: 'Slot' })
  slots?: Types.ObjectId[];

  @Prop()
  createdAt?: Date;
}
export const ServiceSchema = SchemaFactory.createForClass(Service);
ServiceSchema.index({ location: '2dsphere' });
