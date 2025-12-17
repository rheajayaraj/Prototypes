import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
} from '@nestjs/common';
import { HomeCareService } from '../service/home-care.service';
import { BookAppointmentDto } from '../dto/home-care.dto';
import { AuthGuard } from 'src/middleware/auth.guard';

@Controller('homecare')
export class HomeCareController {
  constructor(private readonly svc: HomeCareService) {}

  @UseGuards(AuthGuard)
  @Get('services/nearby')
  async nearby(
    @Req() req,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    const rad = radiusKm ? parseFloat(radiusKm) : 10;
    const userId = req.user?.sub || req.user?.id;
    return this.svc.findServicesNearby(latN, lngN, rad, userId);
  }

  @UseGuards(AuthGuard)
  @Get('slots')
  async getSlots(@Query('serviceId') serviceId: string, @Req() req) {
    const userId = req.user?.sub || req.user?.id;
    return this.svc.getAvailableSlots(serviceId, userId);
  }

  @UseGuards(AuthGuard)
  @Post('appointments/book')
  async bookAppointment(@Req() req, @Body() dto: BookAppointmentDto) {
    // assume req.user._id available via AuthGuard (or receive userId param)
    const userId = req.user?.sub || req.user?.id;
    return this.svc.bookAppointment(userId, dto);
  }

  @Get('appointments/me')
  async myAppointments(@Req() req) {
    const userId = req.user?.sub || req.user?.id;
    return this.svc.getAppointmentsForUser(userId);
  }
}
