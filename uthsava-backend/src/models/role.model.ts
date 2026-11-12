import { Schema, model, Document } from "mongoose";
import { IModulePermission } from "./admin.model";

export interface IRole extends Document {
  name: string;
  description?: string;
  permissions: Map<string, IModulePermission>;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
    permissions: {
      type: Map,
      of: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
        all: { type: Boolean, default: false },
      },
      default: {},
    },
  },
  { timestamps: true }
);

export const RoleModel = model<IRole>("Role", roleSchema);
