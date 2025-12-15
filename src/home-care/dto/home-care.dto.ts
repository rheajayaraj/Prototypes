import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateServiceDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() description?: string;

  // lat/lng provided in body as numbers
  @IsNumber() @IsNotEmpty() latitude: number;
  @IsNumber() @IsNotEmpty() longitude: number;
  @IsNumber() @IsNotEmpty() basePrice: number;
  @IsNumber() @IsNotEmpty() baseDistance: number;
  @IsNumber() @IsNotEmpty() incrementPrice: number;
}

export class CreateSlotDto {
  @IsString() label: string;
  @IsNumber() durationInMinutes: number;
  @IsString() serviceId: string;
}

export class CreateVehicleDto {
  @IsString() driverName: string;
  @IsString() vehicleNo: string;
  @IsString() vehicleType: string;
  @IsNumber() seats: number;
  @IsOptional() available?: boolean;
}

export class CreateProviderDto {
  @IsString() name: string;
  @IsOptional() gender?: 'male' | 'female' | 'other';
  @IsOptional() phone?: string;
}

export class BookAppointmentDto {
  @IsString() @IsNotEmpty() serviceId: string;
  @IsString() @IsNotEmpty() slotId: string;
  @IsNumber() latitude: number; // user lat
  @IsNumber() longitude: number; // user lng
  @IsString() @IsOptional() genderPreference?: 'MALE' | 'FEMALE' | 'other';
  @IsString() @IsOptional() scheduledAt?: string; // ISO datetime string (optional — or compute next available)
}
