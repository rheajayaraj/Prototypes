import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';

export type AppointmentDocument = HydratedDocument<Appointment>;

@Schema({ timestamps: true })
export class Appointment {
  _id: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Service', required: true })
  serviceId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'ServiceProvider',
    required: false,
  })
  assignedProvider?: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Vehicle',
    required: false,
  })
  assignedVehicle?: Types.ObjectId;

  @Prop({ required: true })
  slot: string;

  @Prop({
    type: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    required: true,
  })
  location: { lat: number; lng: number };

  @Prop({
    type: {
      lat: { type: Number, required: false, default: 0 },
      long: { type: Number, required: false, default: 0 },
    },
  })
  providerLiveLocation?: {
    lat: number;
    long: number;
  };

  @Prop({ required: true })
  orderId: string;

  @Prop({
    enum: [
      'PENDING',
      'ASSIGNED',
      'EN_ROUTE',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
    ],
    default: 'PENDING',
  })
  status: string;

  @Prop({ enum: ['MALE', 'FEMALE'] })
  genderPreference: string;

  @Prop({ required: true })
  distanceInKm: number;

  @Prop({ required: true })
  price: number;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
