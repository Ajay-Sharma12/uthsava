import mongoose, { Schema, Document } from 'mongoose';

export enum StreamingQuality {
  SD = 'SD',
  HD = 'HD',
  FULL_HD = 'FULL_HD',
  UHD_4K = 'UHD_4K',
}

export enum PlanStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface ISubscriptionPlan extends Document {
  name: string;
  monthlyPrice: number;
  benefits: string[];
  deviceLimit: number;
  maxConcurrentStreams: number;
  streamingQuality: StreamingQuality;
  maxDownloads: number;
  trialDays: number;
  isAdFree: boolean;
  isPopular: boolean;
  displayOrder: number;
  status: PlanStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    /**
     * Plan Name
     * Example:
     * Basic
     * Standard
     * Premium
     * Family
     */
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 100,
    },

    /**
     * Monthly Price
     * Example: 199
     */
    monthlyPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    /**
     * Plan Features
     */
    benefits: [
      {
        type: String,
        trim: true,
      },
    ],

    /**
     * Total Devices Allowed
     */
    deviceLimit: {
      type: Number,
      required: true,
      min: 1,
    },
    maxConcurrentStreams: {
      type: Number,
      required: true,
      min: 1,
    },
    streamingQuality: {
      type: String,
      enum: Object.values(StreamingQuality),
      required: true,
    },
    maxDownloads: {
      type: Number,
      default: 0,
      min: 0,
    },

    trialDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    isAdFree: {
      type: Boolean,
      default: false,
    },
    //only one will be true at a time
    isPopular: {
      type: Boolean,
      default: false,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: Object.values(PlanStatus),
      default: PlanStatus.ACTIVE,
    },
  },
  {
    timestamps: true,
  }
);

SubscriptionPlanSchema.index({
  displayOrder: 1,
});

SubscriptionPlanSchema.index({
  status: 1,
});

export const SubscriptionPlan = mongoose.model<ISubscriptionPlan>(
  'SubscriptionPlan',
  SubscriptionPlanSchema
);