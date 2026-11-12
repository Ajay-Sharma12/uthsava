import { FilterQuery, Types } from "mongoose";
import {
  Coupon,
  ICoupon,
  CouponStatus,
  DiscountType,
  ApplicableUsers,
  User,
} from "../../../models";
import {
  PaginationHelper,
  PaginationParams,
} from "../../shared/helpers/pagination.helper";
import { QueryBuilder } from "../../shared/helpers/query-builder.helper";
import { Role } from "../../../common/types/auth.types";
import { NotificationDispatcher } from "../../shared/services/notification-dispatcher.service";

export class CouponService {
  static readonly MAX_PERCENTAGE_DISCOUNT = 90;
  static readonly MIN_CODE_LENGTH = 4;
  static readonly MAX_CODE_LENGTH = 20;

static formatListItem(coupon: ICoupon, serial: number) {
  return {
    serial,
    id: coupon._id,
    code: coupon.code,

    discountType: coupon.discountType,
    discountValue: coupon.discountValue,

    minOrderAmount: coupon.minOrderAmount ?? 0,
    maxDiscountAmount: coupon.maxDiscountAmount ?? 0,

    usageLimit: coupon.usageLimit,
    usedCount: coupon.usedCount,

    startDate: coupon.startDate,
    expiryAt: coupon.expiryAt,

    applicableUserType: coupon.applicableUserType,
    applicableUserIds: coupon.applicableUserIds || [],

    status: coupon.status,
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
  };
}

  static async createCoupon(data: {
    code: string;
    discountType: DiscountType;
    discountValue: number;
    usageLimit: number;
    startDate: Date;
    expiryDate: Date;
    perUserLimit: number;
    minOrderAmount?: number;
    maxDiscountAmount?: number;
    applicableUsers: ApplicableUsers;
    assignedUserIds?: string[];
    status?: CouponStatus;
    createdBy?: Types.ObjectId;
  }) {
    const existingCoupon = await Coupon.findOne({ code: data.code.toUpperCase() });
    if (existingCoupon) {
      throw new Error("coupon.code_exists");
    }

const couponData: Partial<ICoupon> = {
  code: data.code.toUpperCase(),
  discountType: data.discountType,
  discountValue: data.discountValue,
  usageLimit: data.usageLimit,

  perUserLimit: data.perUserLimit,
  minOrderAmount: data.minOrderAmount,
  maxDiscountAmount: data.maxDiscountAmount,

  expiryAt: data.expiryDate,
  applicableUserType: data.applicableUsers,
  status: data.status || CouponStatus.ACTIVE,
  startDate: data.startDate,
};

    if (data.applicableUsers === ApplicableUsers.SELECTED) {
      couponData.applicableUserIds = data.assignedUserIds?.map(
        (id) => new Types.ObjectId(id),
      );
    }

    if (data.createdBy) {
      couponData.createdBy = new Types.ObjectId(data.createdBy);
    }

    return await Coupon.create(couponData);
  }

  static async listCoupons(
    params: Required<PaginationParams>,
    filters: {
      search?: string;
      status?: CouponStatus;
      discountType?: DiscountType;
      applicableUsers?: ApplicableUsers;
      fromDate?: string;
      toDate?: string;
    },
  ) {
    await this.refreshExpiredOrConsumedCoupons();

    const query: FilterQuery<ICoupon> = {};

    if (filters.search) {
      Object.assign(
        query,
        QueryBuilder.buildSearchQuery(filters.search, ["code"]),
      );
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.discountType) {
      query.discountType = filters.discountType;
    }

    if (filters.applicableUsers) {
      query.applicableUsers = filters.applicableUsers;
    }

    if (filters.fromDate || filters.toDate) {
      Object.assign(
        query,
        QueryBuilder.buildDateRangeFilter(
          filters.fromDate,
          filters.toDate,
          "expiryDate",
        ),
      );
    }

    return PaginationHelper.paginate(Coupon, query, params);
  }

  static async getCouponById(couponId: string) {
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return null;
    }
    return await this.ensureCouponState(coupon);
  }

static async updateCoupon(
  couponId: string,
  updateData: Partial<ICoupon>
) {
  const coupon = await Coupon.findById(couponId);

  if (!coupon) {
    return null;
  }

  // Active coupons cannot be edited
  if (coupon.status === CouponStatus.ACTIVE) {
    throw new Error(
      "error.runningactiveCouponCodeCannotBeEditable"
    );
  }

  // Build update object
  const updateFields: Partial<ICoupon> = {};

// Coupon Code
if (updateData.code !== undefined) {
  const newCode = String(updateData.code)
    .trim()
    .toUpperCase();

  if (!newCode) {
    throw new Error("coupon.code_required");
  }

  const existingCoupon = await Coupon.findOne({
    code: newCode,
    _id: { $ne: coupon._id },
  });

  if (existingCoupon) {
    throw new Error("coupon.code_exists");
  }

  updateFields.code = newCode;
}

  // Discount Type
  if (updateData.discountType !== undefined) {
    updateFields.discountType =
      updateData.discountType as DiscountType;
  }

  // Discount Value
  if (updateData.discountValue !== undefined) {
    updateFields.discountValue =
      updateData.discountValue;
  }

  // Usage Limit
  if (updateData.usageLimit !== undefined) {
    updateFields.usageLimit =
      updateData.usageLimit;
  }

  // Per User Limit
  if (updateData.perUserLimit !== undefined) {
    updateFields.perUserLimit =
      updateData.perUserLimit;
  }

  // Minimum Order Amount
  if (updateData.minOrderAmount !== undefined) {
    updateFields.minOrderAmount =
      updateData.minOrderAmount;
  }

  // Maximum Discount Amount
  if (updateData.maxDiscountAmount !== undefined) {
    updateFields.maxDiscountAmount =
      updateData.maxDiscountAmount;
  }

  // Start Date
  if (updateData.startDate !== undefined) {
    updateFields.startDate =
      updateData.startDate;
  }

  // Expiry Date
  if (updateData.expiryAt !== undefined) {
    updateFields.expiryAt =
      updateData.expiryAt;
  }

  // Applicable Users
  if (updateData.applicableUserType !== undefined) {
    updateFields.applicableUserType =
      updateData.applicableUserType as ApplicableUsers;
  }

  // Assigned Users
  if (updateData.applicableUserIds !== undefined) {
    updateFields.applicableUserIds =
      updateData.applicableUserIds;
  }

  // Status
  if (updateData.status !== undefined) {
    updateFields.status =
      updateData.status as CouponStatus;
  }
console.log("========== COUPON UPDATE FIELDS ==========");
console.log("Coupon ID:", couponId);
console.log("Update Fields:", updateFields);
console.log("==========================================");
  // Direct MongoDB update
  const updatedCoupon = await Coupon.findByIdAndUpdate(
    couponId,
    {
      $set: updateFields,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  return updatedCoupon;
}


  static async assignUsersToCoupon(couponId: string, userIds: string[]) {
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return null;
    }

    if (coupon.status === CouponStatus.INACTIVE) {
      throw new Error("coupon.inactive");
    }

    const normalizedIds = userIds.map((id) => new Types.ObjectId(id));
    const users = await User.find({
      _id: { $in: normalizedIds },
      role: Role.USER,
    });
    if (users.length !== normalizedIds.length) {
      throw new Error("coupon.invalid_user_ids");
    }

    coupon.applicableUserType = ApplicableUsers.SELECTED;
    coupon.applicableUserIds = normalizedIds;
    return await coupon.save();
  }

  static async getValidCouponByCode(code: string) {
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) {
      throw new Error("coupon.not_found");
    }

    const checkedCoupon = await this.ensureCouponState(coupon);
    if (checkedCoupon.status !== CouponStatus.ACTIVE) {
      throw new Error("coupon.not_active");
    }
    if (checkedCoupon.usedCount >= checkedCoupon.usageLimit) {
      throw new Error("coupon.limit_reached");
    }
    const now = new Date();
    if (checkedCoupon.startDate && checkedCoupon.startDate > now) {
      throw new Error("coupon.not_started");
    }
    if (checkedCoupon.expiryAt < now) {
      throw new Error("error.thisCouponHasExpired");
    }

    return checkedCoupon;
  }

  static async refreshExpiredOrConsumedCoupons() {
    const now = new Date();
    await Coupon.updateMany(
      {
        status: CouponStatus.ACTIVE,
        $or: [
          { expiryAt: { $lt: now } },
          { $expr: { $gte: ["$usedCount", "$usageLimit"] } },
        ],
      },
      { status: CouponStatus.INACTIVE },
    );
  }

  static async ensureCouponState(coupon: ICoupon) {
    const now = new Date();
    let hasChanges = false;

    if (coupon.status === CouponStatus.ACTIVE && coupon.expiryAt < now) {
      coupon.status = CouponStatus.INACTIVE;
      hasChanges = true;
    }

    if (
      coupon.status === CouponStatus.ACTIVE &&
      coupon.usedCount >= coupon.usageLimit
    ) {
      coupon.status = CouponStatus.INACTIVE;
      hasChanges = true;
    }

    if (hasChanges) {
      await coupon.save();
    }

    return coupon;
  }
  static async updateCouponStatus(
  couponId: string,
  status: CouponStatus
) {
  const coupon = await Coupon.findById(couponId);

  if (!coupon) {
    return null;
  }

  coupon.status = status;

  await coupon.save();

  return coupon;
}
}
