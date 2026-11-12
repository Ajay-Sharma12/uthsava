import mongoose, { Schema, Document, Types } from 'mongoose';

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export interface IPaymentTransaction extends Document {
  userId: Types.ObjectId;
  subscriptionId: Types.ObjectId;
  couponId?: Types.ObjectId;
  amount: number;
  discountAmount: number;
  finalAmount: number;
  gatewayTransactionId?: string;
  status: PaymentStatus;
  paidAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const PaymentTransactionSchema =
  new Schema<IPaymentTransaction>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },
      subscriptionId: {
        type: Schema.Types.ObjectId,
        ref: 'UserSubscription',
        required: true,
      },
      couponId: {
        type: Schema.Types.ObjectId,
        ref: 'Coupon',
        default: null,
      },
      amount: {
        type: Number,
        required: true,
      },
      discountAmount: {
        type: Number,
        default: 0,
      },
      finalAmount: {
        type: Number,
        required: true,
      },
      gatewayTransactionId: {
        type: String,
        default: null,
        index: true,
      },
      status: {
        type: String,
        enum: Object.values(PaymentStatus),
        default: PaymentStatus.PENDING,
        index: true,
      },
      paidAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

export const PaymentTransaction =
  mongoose.model<IPaymentTransaction>(
    'PaymentTransaction',
    PaymentTransactionSchema
  );
