import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from '../dto/user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../schema/user.schema';
import { Model } from 'mongoose';
import {
  Hospital,
  HospitalDocument,
} from 'src/general/schemas/hospital.schema';
import * as bcrypt from 'bcrypt';
import { UserSessionsService } from 'src/user-sessions/service/user-sessions.service';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Hospital.name) private hospitalModel: Model<HospitalDocument>,
    private readonly userSessionsService: UserSessionsService,
  ) {}

  async createUser(dto: CreateUserDto, tenantId) {
    const hospital = await this.hospitalModel.findById(tenantId);
    if (!hospital) throw new NotFoundException('Hospital not found');

    const oldUser = await this.userModel.findOne({ email: dto.email });
    if (oldUser) {
      throw new ForbiddenException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const newUser = new this.userModel({
      ...dto,
      password: hashedPassword,
      tenantId,
    });

    return await newUser.save();
  }

  async updatePassword(email: string, newPlainPassword: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new NotFoundException('User not found');

    const hash = await bcrypt.hash(newPlainPassword, 10);
    user.password = hash;
    await user.save();

    // Mark all sessions inactive
    await this.userSessionsService.terminateAllSessionsForUser(user.id);

    return { message: 'Password updated, all sessions terminated' };
  }

  async findByEmailAndTenant(email: string, tenantId: string) {
    return this.userModel.findOne({ email, tenantId });
  }

  async findById(id: string) {
    return this.userModel.findById(id);
  }
}
