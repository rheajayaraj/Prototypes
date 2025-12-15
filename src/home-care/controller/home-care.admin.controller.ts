import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { HomeCareService } from '../service/home-care.service';
import {
  CreateServiceDto,
  CreateSlotDto,
  CreateVehicleDto,
  CreateProviderDto,
} from '../dto/home-care.dto';

@Controller('admin/homecare')
export class HomeCareAdminController {
  constructor(private readonly svc: HomeCareService) {}

  @Post('services')
  createService(@Body() dto: CreateServiceDto) {
    return this.svc.createService(dto);
  }

  @Post('services/update')
  updateService(@Body() body, @Query() id) {
    return this.svc.updateService(id, body);
  }

  @Post('slots')
  createSlot(@Body() dto: CreateSlotDto) {
    return this.svc.createSlot(dto);
  }

  @Post('vehicles')
  createVehicle(@Body() dto: CreateVehicleDto) {
    return this.svc.createVehicle(dto);
  }

  @Post('providers')
  createProvider(@Body() dto: CreateProviderDto) {
    return this.svc.createProvider(dto);
  }

  @Get('appointments/unassigned')
  getUnassigned() {
    return this.svc.getUnassignedAppointments();
  }

  @Post('appointments/:id/assign')
  assign(
    @Param('id') id: string,
    @Body() body: { providerId: string; vehicleId: string },
  ) {
    return this.svc.assignProviderAndVehicle(
      id,
      body.providerId,
      body.vehicleId,
    );
  }
}
