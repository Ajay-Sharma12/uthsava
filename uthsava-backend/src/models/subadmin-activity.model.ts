import { Schema, model, Document, Types } from "mongoose";

export interface ISubAdminActivity extends Document {
  subAdminId: Types.ObjectId;
  module: string;
  action: "view" | "create" | "edit" | "delete";
  method: string;
  path: string;
  statusCode?: number;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const subAdminActivitySchema = new Schema<ISubAdminActivity>(
  {
    subAdminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    module: { type: String, required: true, index: true },
    action: {
      type: String,
      enum: ["view", "create", "edit", "delete"],
      required: true,
      index: true,
    },
    method: { type: String, required: true },
    path: { type: String, required: true },
    statusCode: { type: Number },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: true,
  },
);

subAdminActivitySchema.index({ subAdminId: 1, createdAt: -1 });

export const SubAdminActivity = model<ISubAdminActivity>(
  "SubAdminActivity",
  subAdminActivitySchema,
);
