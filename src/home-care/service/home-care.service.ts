import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Sse,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema, Types } from 'mongoose';
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
import { calculateDistanceKm } from 'src/utils/distance.util';
import { calculatePrice } from 'src/utils/pricing.util';

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
      location: { type: 'Point', coordinates: [dto.latitude, dto.longitude] },
      baseDistance: dto.baseDistance,
      basePrice: dto.basePrice,
      incrementPrice: dto.incrementPrice,
    });
    return doc.save();
  }

  async updateService(id, body) {
    id = new Types.ObjectId(id);
    const service = this.serviceModel.findByIdAndUpdate(id, body, {
      new: true,
    });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async createSlot(dto: CreateSlotDto) {
    const service = await this.serviceModel.findById(dto.serviceId);
    if (!service) throw new NotFoundException('Service not found');

    const startHour = 9;
    const endHour = 18;

    const slots: Partial<Slot>[] = [];

    let start = new Date();
    start.setHours(startHour, 0, 0, 0);

    let end = new Date(start);
    end.setMinutes(start.getMinutes() + dto.durationInMinutes);

    while (end.getHours() <= endHour) {
      slots.push({
        start: new Date(start),
        end: new Date(end),
        durationInMinutes: dto.durationInMinutes,
        serviceId: new Types.ObjectId(dto.serviceId),
        label: dto.label,
      });

      start = new Date(end);
      end = new Date(start);
      end.setMinutes(start.getMinutes() + dto.durationInMinutes);
    }

    return this.slotModel.insertMany(slots);
  }

  async createVehicle(dto: CreateVehicleDto) {
    const v = new this.vehicleModel(dto);
    return v.save();
  }

  async createProvider(dto: CreateProviderDto) {
    const p = new this.providerModel({ ...dto, available: true });
    return p.save();
  }

  async getAvailableSlots(serviceId: string, userId: string) {
    // Fetch all slots for this service
    const allSlots = await this.slotModel.find({ serviceId });

    // Fetch all appointments made by this user for this service
    const booked = await this.appointmentModel
      .find({
        userId,
        serviceId,
      })
      .select('slot');

    const bookedSlotIds = booked.map((b) => b.slot.toString());

    // Filter out booked slots
    const availableSlots = allSlots.filter(
      (slot) => !bookedSlotIds.includes(slot._id.toString()),
    );

    return availableSlots;
  }

  // find services within radiusKm km
  async findServicesNearby(lat: number, lng: number, radiusKm = 10, userId) {
    const meters = radiusKm * 1000;
    const results = await this.serviceModel
      .find({
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [lat, lng] },
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

    const slot = await this.slotModel.findOne({
      _id: dto.slotId,
      serviceId: service.id,
    });
    if (!slot) throw new NotFoundException('Slot not found');
    if (slot.active == false)
      throw new ForbiddenException('Slot is not Active');

    const existingAppointment = await this.appointmentModel.findOne({
      serviceId: service.id,
      slot: slot.id,
      userId,
    });
    if (existingAppointment)
      throw new ForbiddenException('Appoinment already exists');

    // schedule time (if provided)
    let scheduledAt: Date;
    if (dto.scheduledAt) {
      scheduledAt = new Date(dto.scheduledAt);
    } else {
      // default: now + 30min (or compute next available time based on slot)
      scheduledAt = new Date();
    }

    const orderId = `${orderPrefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const distance = calculateDistanceKm(
      dto.latitude,
      dto.longitude,
      service.location.coordinates[0],
      service.location.coordinates[1],
    );

    // 2. Calculate price
    const price = calculatePrice(
      distance,
      service.basePrice,
      service.baseDistance,
      service.incrementPrice,
    );

    const appt = new this.appointmentModel({
      userId: userId,
      serviceId: service.id,
      slot: slot.id,
      orderId,
      scheduledAt,
      location: { lat: dto.latitude, lng: dto.longitude },
      status: 'PENDING',
      genderPreference: dto.genderPreference,
      distanceInKm: distance,
      price,
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
