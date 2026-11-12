import mongoose, { Schema, Document, Types } from 'mongoose';

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export interface IUserSubscription extends Document {
  userId: Types.ObjectId;
  planId: Types.ObjectId;
  couponId?: Types.ObjectId;
  autoRenewal: boolean;
  startDate: Date;
  endDate: Date;
  status: SubscriptionStatus;
  remindersSent?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSubscriptionSchema =
  new Schema<IUserSubscription>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      planId: {
        type: Schema.Types.ObjectId,
        ref: 'SubscriptionPlan',
        required: true,
      },
      couponId: {
        type: Schema.Types.ObjectId,
        ref: 'Coupon',
        default: null,
      },
      autoRenewal: {
        type: Boolean,
        default: true,
      },
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
        index: true,
      },
      status: {
        type: String,
        enum: Object.values(SubscriptionStatus),
        default: SubscriptionStatus.ACTIVE,
        index: true,
      },
      remindersSent: {
        type: [String],
        default: [],
      },
    },
    {
      timestamps: true,
    }
  );

UserSubscriptionSchema.index({
  userId: 1,
  status: 1,
});

export const UserSubscription =
  mongoose.model<IUserSubscription>(
    'UserSubscription',
    UserSubscriptionSchema
  );