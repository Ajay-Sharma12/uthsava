import { Schema, model, Document, Types } from "mongoose";

/**
 * AvatarStatus – controls whether the avatar category is shown in the app.
 */
export enum AvatarStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export interface IAvatar extends Document {
  /** Category name to group avatars (e.g., "Animals", "Moods", "Boy Avatar", "Baby Avatar", "South Heroine's", "Mirzapur") */
  category: string;

  /** Optional description for the category */
  description?: string;

  /** Array of S3 keys or CloudFront URLs for avatar images under this category */
  images: string[];

  /** Flags if this avatar category is intended for Kids profiles (true) or Standard/Adult profiles (false) */
  isKids: boolean;

  /** Active or inactive status */
  status: AvatarStatus;

  /** Admin or user who uploaded/created this avatar category */
  createdBy?: Types.ObjectId | null;

  /** Admin or user who last updated this avatar category */
  updatedBy?: Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
}

const avatarSchema = new Schema<IAvatar>(
  {
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    images: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],

    isKids: {
      type: Boolean,
      default: false,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(AvatarStatus),
      default: AvatarStatus.ACTIVE,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

avatarSchema.index({ status: 1, isKids: 1, category: 1 });

export const Avatar = model<IAvatar>("Avatar", avatarSchema);
