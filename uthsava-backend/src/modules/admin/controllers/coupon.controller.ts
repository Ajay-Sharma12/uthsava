import { Request, Response } from "express";
import { Types } from "mongoose";
import moment from "moment";
import { CouponService } from "../services/coupon.service";
import { ResponseHandler } from "../../../common/responses/response.handler";
import { getLanguage } from "../../shared/helpers/language.helper";
import { PaginationHelper } from "../../shared/helpers/pagination.helper";
import { logger } from "../../../core/constants/logger";
import { HTTP_STATUS } from "../../../core/constants/app.constants";
import { User } from "../../../models";
import { AuditLogService } from "../services/audit-log.service";
import { AuditModule } from "../../../models/audit-log.model";

const parseExpiryDate = (
  expiryDate: string,
  expiryTime?: string,
): Date | null => {
  if (!expiryDate) {
    return null;
  }

  // if already ISO date
  if (moment(expiryDate, moment.ISO_8601, true).isValid()) {
    const baseDate = moment(expiryDate);

    if (expiryTime) {
      const [hours, minutes] = expiryTime.split(":");

      baseDate.set({
        hour: Number(hours),
        minute: Number(minutes),
        second: 0,
        millisecond: 0,
      });
    }

    return baseDate.toDate();
  }

  const formats = [
    "YYYY-MM-DD",
    "MMMM Do, YYYY",
    "MMMM D, YYYY",
    "MM/DD/YYYY",
    "DD/MM/YYYY",
  ];

  const dateString = expiryTime ? `${expiryDate} ${expiryTime}` : expiryDate;

  const parsed = moment(dateString, [...formats, "YYYY-MM-DD HH:mm"], true);

  return parsed.isValid() ? parsed.toDate() : null;
};

const resolveSelectedUsers = async (selectedUsers?: string[]) => {
  if (!selectedUsers || !selectedUsers.length) {
    return [];
  }

  const ids: string[] = [];
  const emails: string[] = [];

  selectedUsers.forEach((value) => {
    if (moment(value, "YYYY-MM-DDTHH:mm:ss", true).isValid()) {
      return;
    }

    if (/^[0-9a-fA-F]{24}$/.test(value)) {
      ids.push(value);
    } else {
      emails.push(value.toLowerCase().trim());
    }
  });

  const query: any[] = [];
  if (ids.length) query.push({ _id: { $in: ids } });
  if (emails.length) query.push({ email: { $in: emails } });

  if (!query.length) {
    return [];
  }

  const users = await User.find({ $or: query }).select("_id email");
  return users.map((user) => user._id.toString());
};

export const listCoupons = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const pagination = PaginationHelper.parseParams(req.query, [
      "code",
      "discountType",
      "discountValue",
      "usageLimit",
      "expiryDate",
      "applicableUsers",
      "status",
      "createdAt",
      "updatedAt",
    ]);

    const filters = {
      search: req.query.search as string,
      status: req.query.status as any,
      discountType: req.query.discountType as any,
      applicableUsers: req.query.applicableUsers as any,
      fromDate: req.query.fromDate as string,
      toDate: req.query.toDate as string,
    };

    const result = await CouponService.listCoupons(pagination, filters);
    const serialStart = (pagination.page - 1) * pagination.limit;

    return ResponseHandler.success(
      res,
      {
        data: result.data.map((coupon, index) =>
          CouponService.formatListItem(coupon as any, serialStart + index + 1),
        ),
        pagination: result.pagination,
      },
      "coupon.listed",
      lang,
    );
  } catch (error: any) {
    logger.error("List coupons error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

export const getCouponById = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { couponId } = req.params;

    const coupon = await CouponService.getCouponById(couponId);
    if (!coupon) {
      return ResponseHandler.error(
        res,
        "coupon.not_found",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    return ResponseHandler.success(res, { coupon }, "coupon.retrieved", lang);
  } catch (error: any) {
    logger.error("Get coupon by id error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

export const createCoupon = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
const {
  code,
  discountType,
  discountValue,
  usageLimit,
  perUserLimit,
  minOrderAmount,
  maxDiscountAmount,
  startDate,
  expiryDate,
  expiryTime,
  applicableUsers,
  selectedUsers,
  assignedUserIds,
  status,
} = req.body;

    const selectedUserIds = selectedUsers || assignedUserIds;
    if (
      applicableUsers === "selected" &&
      (!selectedUserIds || selectedUserIds.length === 0)
    ) {
      return ResponseHandler.validationError(
        res,
        { selectedUsers: "At least one user must be selected" },
        "validation.failed",
        lang,
      );
    }

    const expiryDateTime = parseExpiryDate(expiryDate, expiryTime);
    if (!expiryDateTime) {
      return ResponseHandler.validationError(
        res,
        { expiryDate: "Expiry date must be a valid date" },
        "validation.failed",
        lang,
      );
    }
    
    // Prevent admin from entering a past date as the expiry date
    if (expiryDateTime < new Date()) {
      return ResponseHandler.validationError(
        res,
        { expiryDate: "The system must prevent admin from entering a past date as the expiry date." },
        "validation.failed",
        lang,
      );
    }
    
    let startDateTime: Date | undefined;
    if (startDate) {
      startDateTime = moment(startDate).toDate();
      if (!startDateTime || isNaN(startDateTime.getTime())) {
        return ResponseHandler.validationError(
          res,
          { startDate: "Start date must be a valid date" },
          "validation.failed",
          lang,
        );
      }
    }

    const resolvedUserIds = selectedUsers
      ? await resolveSelectedUsers(selectedUsers)
      : assignedUserIds;
    if (
      applicableUsers === "selected" &&
      selectedUsers &&
      resolvedUserIds.length !== selectedUsers.length
    ) {
      return ResponseHandler.validationError(
        res,
        { selectedUsers: "One or more selected users are invalid" },
        "validation.failed",
        lang,
      );
    }

const coupon = await CouponService.createCoupon({
  code,
  discountType,
  discountValue,
  usageLimit,
  startDate: startDateTime || new Date(),
  expiryDate: expiryDateTime,
  perUserLimit,
  minOrderAmount,
  maxDiscountAmount,
  applicableUsers,
  assignedUserIds: resolvedUserIds,
  status,
  createdBy: (req as any).user?.sub
    ? new Types.ObjectId((req as any).user.sub as string)
    : undefined,
});

    AuditLogService.logAction({
      adminId: (req as any).user?.sub || (req as any).user?._id,
      module: AuditModule.COUPONS,
      action: "Create Coupon",
      entityId: (coupon as any)?._id || (coupon as any)?.id,
      newData: req.body,
      req,
    }).catch(err => logger.error("Audit log error:", err));

    return ResponseHandler.success(
      res,
      { coupon },
      "coupon.created",
      lang,
      HTTP_STATUS.CREATED,
    );
  } catch (error: any) {
    logger.error("Create coupon error:", error);
    const lang = getLanguage(req);

    if (error.message === "coupon.code_exists") {
      return ResponseHandler.conflict(res, "This coupon code already exists. Please enter a unique code.", lang);
    }

    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

export const updateCoupon = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { couponId } = req.params;
const {
  code,
  discountType,
  discountValue,
  usageLimit,
  perUserLimit,
  minOrderAmount,
  maxDiscountAmount,
  startDate,
  expiryDate,
  expiryTime,
  applicableUsers,
  selectedUsers,
  assignedUserIds,
  status,
} = req.body;

    const selectedUserIds = selectedUsers || assignedUserIds;
    if (
      applicableUsers === "selected" &&
      selectedUserIds &&
      selectedUserIds.length === 0
    ) {
      return ResponseHandler.validationError(
        res,
        { selectedUsers: "At least one user must be selected" },
        "validation.failed",
        lang,
      );
    }

    const expiryDateTime = expiryDate
      ? parseExpiryDate(expiryDate, expiryTime)
      : undefined;
    if (expiryDate && !expiryDateTime) {
      return ResponseHandler.validationError(
        res,
        { expiryDate: "Expiry date must be a valid date" },
        "validation.failed",
        lang,
      );
    }
    
    // Prevent admin from entering a past date as the expiry date
    if (expiryDateTime && expiryDateTime < new Date()) {
      return ResponseHandler.validationError(
        res,
        { expiryDate: "The system must prevent admin from entering a past date as the expiry date." },
        "validation.failed",
        lang,
      );
    }
    
    let startDateTime: Date | undefined;
    if (startDate) {
      startDateTime = moment(startDate).toDate();
      if (!startDateTime || isNaN(startDateTime.getTime())) {
        return ResponseHandler.validationError(
          res,
          { startDate: "Start date must be a valid date" },
          "validation.failed",
          lang,
        );
      }
    }

    const resolvedUserIds = selectedUsers
      ? await resolveSelectedUsers(selectedUsers)
      : assignedUserIds;
    if (
      applicableUsers === "selected" &&
      selectedUsers &&
      resolvedUserIds.length !== selectedUsers.length
    ) {
      return ResponseHandler.validationError(
        res,
        { selectedUsers: "One or more selected users are invalid" },
        "validation.failed",
        lang,
      );
    }

const updateData: any = {
  code,

  discountType,

  discountValue:
    discountValue !== undefined
      ? Number(discountValue)
      : undefined,

  usageLimit:
    usageLimit !== undefined
      ? Number(usageLimit)
      : undefined,

  perUserLimit:
    perUserLimit !== undefined
      ? Number(perUserLimit)
      : undefined,

  minOrderAmount:
    minOrderAmount !== undefined
      ? Number(minOrderAmount)
      : undefined,

  maxDiscountAmount:
    maxDiscountAmount !== undefined
      ? Number(maxDiscountAmount)
      : undefined,

  startDate: startDateTime,

  expiryAt: expiryDateTime || undefined,

  applicableUserType: applicableUsers,

  applicableUserIds: resolvedUserIds,

  status,
};

console.log("========== CONTROLLER COUPON UPDATE ==========");
console.log("Coupon ID:", couponId);
console.log("Update Data:", updateData);
console.log("===============================================");

const updatedCoupon = await CouponService.updateCoupon(
  couponId,
  updateData
);

    if (!updatedCoupon) {
      return ResponseHandler.error(
        res,
        "coupon.not_found",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    AuditLogService.logAction({
      adminId: (req as any).user?.sub || (req as any).user?._id,
      module: AuditModule.COUPONS,
      action: "Update Coupon",
      entityId: couponId,
      newData: req.body,
      req,
    }).catch(err => logger.error("Audit log error:", err));

    return ResponseHandler.success(
      res,
      { coupon: updatedCoupon },
      "coupon.updated",
      lang,
    );
  } catch (error: any) {
    logger.error("Update coupon error:", error);
    const lang = getLanguage(req);

    if (error.message === "error.runningactiveCouponCodeCannotBeEditable") {
      return ResponseHandler.badRequest(res, error.message, lang);
    }

    if (error.message === "coupon.code_exists") {
      return ResponseHandler.conflict(res, "This coupon code already exists. Please enter a unique code.", lang);
    }

    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

export const updateCouponStatus = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { couponId } = req.params;
    const { status } = req.body;

    const updatedCoupon = await CouponService.updateCouponStatus(
      couponId,
      status,
    );
    if (!updatedCoupon) {
      return ResponseHandler.error(
        res,
        "coupon.not_found",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    AuditLogService.logAction({
      adminId: (req as any).user?.sub || (req as any).user?._id,
      module: AuditModule.COUPONS,
      action: "Update Coupon Status",
      entityId: couponId,
      newData: { status },
      req,
    }).catch(err => logger.error("Audit log error:", err));

    return ResponseHandler.success(
      res,
      { coupon: updatedCoupon },
      "coupon.status_updated",
      lang,
    );
  } catch (error: any) {
    logger.error("Update coupon status error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

export const assignUsersToCoupon = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { couponId } = req.params;
    const { userIds } = req.body;

    const coupon = await CouponService.assignUsersToCoupon(couponId, userIds);
    if (!coupon) {
      return ResponseHandler.error(
        res,
        "coupon.not_found",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    return ResponseHandler.success(
      res,
      { coupon },
      "coupon.users_assigned",
      lang,
    );
  } catch (error: any) {
    logger.error("Assign users to coupon error:", error);
    const lang = getLanguage(req);

    if (error.message === "coupon.invalid_user_ids") {
      return ResponseHandler.validationError(
        res,
        { userIds: "coupon.invalid_user_ids" },
        "validation.failed",
        lang,
      );
    }
    if (error.message === "coupon.inactive") {
      return ResponseHandler.badRequest(res, "coupon.inactive", lang);
    }

    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};
