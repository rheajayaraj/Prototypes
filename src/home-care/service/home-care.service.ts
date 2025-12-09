import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Service, ServiceDocument } from '../schema/services.schema';
import { Slot, SlotDocument } from '../schema/slot.schema';
import { Vehicle, VehicleDocument } from '../schema/vehicle.schema';
import {
  ServiceProvider,
  ServiceProviderDocument,
} from '../schema/service-provider.schema';
import { Appointment, AppointmentDocument } from '../schema/appointment.schema';
import {
  CreateServiceDto,
  CreateSlotDto,
  CreateVehicleDto,
  CreateProviderDto,
  BookAppointmentDto,
} from '../dto/home-care.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class HomeCareService {
  constructor(
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
    @InjectModel(Slot.name) private slotModel: Model<SlotDocument>,
    @InjectModel(Vehicle.name) private vehicleModel: Model<VehicleDocument>,
    @InjectModel(ServiceProvider.name)
    private providerModel: Model<ServiceProviderDocument>,
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
  ) {}

  // admin: create service (with location)
  async createService(dto: CreateServiceDto) {
    const doc = new this.serviceModel({
      name: dto.name,
      description: dto.description,
      location: { type: 'Point', coordinates: [dto.longitude, dto.latitude] },
    });
    return doc.save();
  }

  async createSlot(dto: CreateSlotDto) {
    const slot = new this.slotModel(dto);
    return await slot.save();
  }

  async createVehicle(dto: CreateVehicleDto) {
    const v = new this.vehicleModel(dto);
    return v.save();
  }

  async createProvider(dto: CreateProviderDto) {
    const p = new this.providerModel({ ...dto, available: true });
    return p.save();
  }

  // find services within radiusKm km
  async findServicesNearby(lat: number, lng: number, radiusKm = 10) {
    const meters = radiusKm * 1000;
    const results = await this.serviceModel
      .find({
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: meters,
          },
        },
      })
      .lean();
    return results;
  }

  // booking: check that service exists and slot exists
  async bookAppointment(
    userId: string,
    dto: BookAppointmentDto,
    orderPrefix = 'HC',
  ) {
    const service = await this.serviceModel.findById(dto.serviceId);
    if (!service) throw new NotFoundException('Service not found');

    const slot = await this.slotModel.findById(dto.slotId);
    if (!slot) throw new NotFoundException('Slot not found');

    // schedule time (if provided)
    let scheduledAt: Date;
    if (dto.scheduledAt) {
      scheduledAt = new Date(dto.scheduledAt);
    } else {
      // default: now + 30min (or compute next available time based on slot)
      scheduledAt = new Date();
    }

    const orderId = `${orderPrefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const appt = new this.appointmentModel({
      userId: userId,
      serviceId: service.id,
      slot: slot.id,
      orderId,
      scheduledAt,
      location: { lat: dto.longitude, lng: dto.latitude },
      status: 'PENDING',
      genderPreference: dto.genderPreference,
    });

    const saved = await appt.save();

    // return appointment (admin will assign provider later)
    return saved;
  }

  // admin: assign nurse and vehicle
  async assignProviderAndVehicle(
    apptId: string,
    providerId: string,
    vehicleId: string,
  ) {
    const appt = await this.appointmentModel.findById(apptId);
    if (!appt) throw new NotFoundException('Appointment not found');

    const provider = await this.providerModel.findById(providerId);
    const vehicle = await this.vehicleModel.findById(vehicleId);
    if (!provider) throw new NotFoundException('Provider not found');
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    // mark assigned
    appt.assignedProvider = provider._id;
    appt.assignedVehicle = vehicle._id;
    appt.status = 'ASSIGNED';
    await appt.save();

    // mark provider and vehicle unavailable
    provider.available = false;
    await provider.save();

    vehicle.available = false;
    await vehicle.save();

    return appt;
  }

  // update provider live location from socket
  async updateProviderLocation(providerId: string, lng: number, lat: number) {
    const provider = await this.providerModel.findById(providerId);
    if (!provider) throw new NotFoundException('Provider not found');

    provider.currentLocation = { lat, long: lng };
    await provider.save();

    // update appointment's live location if needed
    const appt = await this.appointmentModel.findOne({
      assignedProvider: provider._id,
      status: { $in: ['ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS'] },
    });

    if (appt) {
      appt.providerLiveLocation = { lat, long: lng };

      if (appt.status === 'ASSIGNED') {
        appt.status = 'EN_ROUTE';
      }

      await appt.save();
    }

    return { ok: true };
  }

  // helper: get appointments for a user (tenant filter can be applied by caller)
  async getAppointmentsForUser(userId: string) {
    return this.appointmentModel
      .find({ user: userId })
      .populate('service slot assignedProvider assignedVehicle')
      .lean();
  }

  // admin: get unassigned appointments
  async getUnassignedAppointments() {
    return this.appointmentModel
      .find({ status: 'CREATED' })
      .populate('user service slot')
      .lean();
  }
}
