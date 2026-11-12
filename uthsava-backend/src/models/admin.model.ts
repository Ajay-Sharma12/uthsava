import { Schema, Types } from "mongoose";
import { User } from "./user.model";
import { Role } from "../common/types/auth.types";

export interface IModulePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  all: boolean;
}

export interface IAdmin {
  // Add any admin-specific fields here in the future
}

export interface ISubAdmin {
  address?: string;
  addedBy?: Types.ObjectId;
  roleId?: Types.ObjectId;
  permissions?: Map<string, IModulePermission>;
  customPermissions?: Map<string, IModulePermission>;
  isActionRequired?: boolean;
  passwordExpiryDate?: Date;
  passwordExpiryDays?: number;
  isPasswordExpired?: boolean;
}

const adminSchema = new Schema<IAdmin>({
  // No specific fields for admin right now, they share all base User fields
});

const subAdminSchema = new Schema<ISubAdmin>({
  address: { type: String, trim: true },
  addedBy: { type: Schema.Types.ObjectId, ref: "User" },
  roleId: { type: Schema.Types.ObjectId, ref: "Role" },
  permissions: {
    type: Map,
    of: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      approve: { type: Boolean, default: false },
      all: { type: Boolean, default: false },
    },
    default: {},
  },
  customPermissions: {
    type: Map,
    of: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      approve: { type: Boolean, default: false },
      all: { type: Boolean, default: false },
    },
    default: {},
  },
  isActionRequired: { type: Boolean, default: false },
  // Password expiry tracking for auto-generated passwords
  passwordExpiryDate: { type: Date, default: null },
  passwordExpiryDays: { type: Number, default: 10 }, // Default 10 days for auto-generated passwords
  isPasswordExpired: { type: Boolean, default: false },
});

export const Admin = User.discriminator<IAdmin>(Role.ADMIN, adminSchema);
export const SubAdmin = User.discriminator<ISubAdmin>(Role.ADMIN_SUB_USER, subAdminSchema);
