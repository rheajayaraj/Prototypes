import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ServiceProviderDocument = ServiceProvider & Document;

@Schema()
export class ServiceProvider {
  @Prop({ type: MongooseSchema.Types.ObjectId, auto: true })
  _id?: MongooseSchema.Types.ObjectId;

  @Prop()
  name: string;

  @Prop()
  gender?: 'male' | 'female' | 'other';

  @Prop()
  phone?: string;

  @Prop({ default: true })
  available: boolean;

  @Prop({
    type: {
      lat: { type: Number, required: true, default: 0 },
      long: { type: Number, required: true, default: 0 },
    },
  })
  currentLocation: {
    lat: number;
    long: number;
  };

  @Prop()
  createdAt?: Date;
}

export const ServiceProviderSchema =
  SchemaFactory.createForClass(ServiceProvider);
ServiceProviderSchema.index({ currentLocation: '2dsphere' });
