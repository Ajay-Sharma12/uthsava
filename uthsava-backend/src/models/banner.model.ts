import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Banner Status Enum
 */
export enum BannerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/**
 * Interface representing a Banner Manager entry in MongoDB.
 * Links specific Content items (Movies or Series) to feature in the Hero Banner carousel.
 */
export interface IBanner extends Document {
  contentId: Types.ObjectId;
  customTitle?: string;
  customBannerImage?: string;
  displayOrder: number;
  status: BannerStatus;
  startDate?: Date;
  endDate?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const BannerSchema = new Schema<IBanner>(
  {
    contentId: {
      type: Schema.Types.ObjectId,
      ref: 'Content',
      required: true,
      index: true,
    },
    customTitle: {
      type: String,
      trim: true,
      default: null,
    },
    customBannerImage: {
      type: String,
      trim: true,
      default: null,
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(BannerStatus),
      default: BannerStatus.ACTIVE,
      index: true,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient querying of active banners sorted by display order
BannerSchema.index({ status: 1, displayOrder: 1 });

export const Banner = mongoose.model<IBanner>('Banner', BannerSchema);
