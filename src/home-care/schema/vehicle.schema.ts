import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VehicleDocument = Vehicle & Document;

@Schema()
export class Vehicle {
  @Prop()
  driverName: string;

  @Prop()
  vehicleNo: string;

  @Prop()
  vehicleType: string; // e.g. car, van, ambulance

  @Prop()
  seats: number;

  @Prop({ default: true })
  available: boolean;

  @Prop()
  createdAt?: Date;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);
