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
import { Role, RoleDocument } from 'src/general/schemas/role.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Hospital.name) private hospitalModel: Model<HospitalDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
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

    const role = await this.roleModel.findOne({ key: dto.roleKey });
    if (!role) throw new Error('Invalid role key');

    const newUser = new this.userModel({
      ...dto,
      password: hashedPassword,
      role: role._id,
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

  async getUsersWithPermissions(jwtUser: any) {
    const userId = jwtUser.id;
    const tenantId = jwtUser.tenantId; // array of tenant ObjectIds
    const user = await this.userModel.findById(userId);
    const roleId = user!.role.toString();

    // GET ROLE & PERMISSIONS
    const role = await this.roleModel.findById(roleId).lean();
    if (!role) throw new ForbiddenException('Role not found');

    const viewPerm = role.permissions.find((p) => p.key === 'user')?.actions;

    if (!viewPerm?.view && !viewPerm?.readAll) {
      throw new ForbiddenException('You do not have permission to view users');
    }

    // BUILD QUERY: only users from same hospital tenant
    const query: any = { tenantId };

    let users = await this.userModel.find(query).lean();

    // APPLY FIELD-LEVEL RESTRICTIONS
    const restricted = viewPerm.restricted_view_fields || [];
    const allowed = viewPerm.allowed_view_fields || [];

    users = users.map((user) => {
      const filtered = { ...user };

      // Remove restricted fields
      for (const field of restricted) delete filtered[field];

      // If allowed fields exist → return ONLY those
      if (allowed.length > 0) {
        const allowFiltered: any = {};
        allowed.forEach((f) => (allowFiltered[f] = filtered[f]));
        return allowFiltered;
      }

      return filtered;
    });

    return { count: users.length, users };
  }
}
