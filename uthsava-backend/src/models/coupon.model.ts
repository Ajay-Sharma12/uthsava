import mongoose, { Schema, Document, Types } from 'mongoose';

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED_AMOUNT',
}

export enum CouponStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum ApplicableUsers {
  ALL = 'ALL_USERS',
  SELECTED = 'SELECTED_USERS',
}

export interface ICoupon extends Document {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  usageLimit: number;
  usedCount: number;

  perUserLimit?: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;

  expiryAt: Date;
  applicableUserType: ApplicableUsers;
  applicableUserIds?: Types.ObjectId[];
  status: CouponStatus;
  remindersSent?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  startDate?: Date;
  createdBy?: Types.ObjectId;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 4,
      maxlength: 20,
    },
    discountType: {
      type: String,
      enum: Object.values(DiscountType),
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 1,
    },
    usageLimit: {
      type: Number,
      required: true,
      min: 1,
    },
    perUserLimit: {
  type: Number,
  min: 1,
  default: 1,
},

minOrderAmount: {
  type: Number,
  min: 0,
  default: 0,
},

maxDiscountAmount: {
  type: Number,
  min: 0,
  default: 0,
},
    usedCount: {
      type: Number,
      default: 0,
    },
    expiryAt: {
      type: Date,
      required: true,
    },
    applicableUserType: {
      type: String,
      enum: Object.values(ApplicableUsers),
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /**
     * Used only when:
     * applicableUserType = SELECTED_USERS
     */
    applicableUserIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: Object.values(CouponStatus),
      default: CouponStatus.ACTIVE,
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

//Unique coupon code
CouponSchema.index(
  {
    code: 1,
  },
  {
    unique: true,
  }
);

//Coupon validation lookup
CouponSchema.index({
  code: 1,
  status: 1,
});

//Expiry processing
CouponSchema.index({
  expiryAt: 1,
});

//Listing filters
CouponSchema.index({
  createdAt: -1,
});

export const Coupon = mongoose.model<ICoupon>(
  'Coupon',
  CouponSchema
);
