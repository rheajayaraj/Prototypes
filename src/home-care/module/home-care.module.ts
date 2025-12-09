import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HomeCareService } from '../service/home-care.service';
import { HomeCareController } from '../controller/home-care.user.controller';
import { HomeCareAdminController } from '../controller/home-care.admin.controller';
import { HomeCareGateway } from '../service/home-care.gateway';
import { Service, ServiceSchema } from '../schema/services.schema';
import { Slot, SlotSchema } from '../schema/slot.schema';
import { Vehicle, VehicleSchema } from '../schema/vehicle.schema';
import {
  ServiceProvider,
  ServiceProviderSchema,
} from '../schema/service-provider.schema';
import { Appointment, AppointmentSchema } from '../schema/appointment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Service.name, schema: ServiceSchema },
      { name: Slot.name, schema: SlotSchema },
      { name: Vehicle.name, schema: VehicleSchema },
      { name: ServiceProvider.name, schema: ServiceProviderSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
  ],
  controllers: [HomeCareController, HomeCareAdminController],
  providers: [HomeCareService, HomeCareGateway],
  exports: [HomeCareService],
})
export class HomeCareModule {}
