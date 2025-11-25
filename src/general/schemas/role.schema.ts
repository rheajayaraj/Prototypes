import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Status, UserType } from '../../common/enums';
import { Types } from 'mongoose';

export type RoleDocument = Role & Document;

export class PermissionActions {
  @Prop({ default: false })
  create: boolean;

  @Prop({ default: false })
  view: boolean;

  @Prop({ default: false })
  update: boolean;

  @Prop({ default: false })
  delete: boolean;

  @Prop({ default: false })
  readAll: boolean;

  @Prop()
  restricted_edit_fields?: string[];

  @Prop()
  restricted_view_fields?: string[];

  @Prop()
  restricted_create_fields?: string[];

  @Prop()
  allowed_create_fields?: string[];

  @Prop()
  allowed_edit_fields?: string[];

  @Prop()
  allowed_view_fields?: string[];
}

@Schema()
export class Permission {
  @Prop()
  key: string;

  @Prop()
  name: string;

  @Prop({ type: PermissionActions })
  actions: PermissionActions;
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Role {
  _id: Types.ObjectId;
  @Prop()
  name: string;

  @Prop()
  key: UserType;

  @Prop()
  status: Status;

  @Prop()
  permissions: Permission[];

  @Prop({ type: [Types.ObjectId], ref: 'HospitalTenant', required: false })
  tenant: Types.ObjectId[];
}

export const RoleSchema = SchemaFactory.createForClass(Role);
