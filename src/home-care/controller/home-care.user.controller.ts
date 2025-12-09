import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { HomeCareService } from '../service/home-care.service';
import { BookAppointmentDto } from '../dto/home-care.dto';
import { AuthGuard } from 'src/middleware/auth.guard';

@Controller('homecare')
export class HomeCareController {
  constructor(private readonly svc: HomeCareService) {}

  @Get('services/nearby')
  async nearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    const rad = radiusKm ? parseFloat(radiusKm) : 10;
    return this.svc.findServicesNearby(latN, lngN, rad);
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
    const userId = req.user?.sub || req.user?._id;
    return this.svc.getAppointmentsForUser(userId);
  }
}
