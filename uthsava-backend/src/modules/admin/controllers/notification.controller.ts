import { Request, Response } from "express";
import { Types } from "mongoose";
import { ResponseHandler } from "../../../common/responses/response.handler";
import { getLanguage } from "../../shared/helpers/language.helper";
import { PaginationHelper } from "../../shared/helpers/pagination.helper";
import { NotificationService } from "../services/notification.service";
import { logger } from "../../../core/constants/logger";
import { HTTP_STATUS } from "../../../core/constants/app.constants";
import { JwtPayload } from "../../../common/types/auth.types";
import { AdminSentNotification } from "../../../models/admin-sent-notification.model";
import { User } from "../../../models";

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * List admin-sent notifications
 * GET /api/v1/admin/notifications
 */
export const listNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const senderIdString = req.user?._id || req.user?.sub || (req as any).user?.id;

    if (!senderIdString) {
      return ResponseHandler.error(
        res,
        "auth.unauthorized",
        lang,
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    const senderId = new Types.ObjectId(senderIdString);
    const paginationParams = PaginationHelper.parseParams(req.query, [
      "createdAt",
      "title",
      "sendTo",
      "recipientCount",
    ]);

    const search = req.query.search as string | undefined;
    const sendTo = req.query.sendTo as string | undefined;
    const category = req.query.category as string | undefined;
    const status = req.query.status as string | undefined;

    const searchQuery = NotificationService.buildSearchQuery(search);
    const query: any = { ...searchQuery, senderId };

    if (sendTo) query.recipientType = new RegExp(`^${sendTo}$`, "i");
    if (category) query.type = new RegExp(`^${category}$`, "i");
    // Match both legacy lowercase ("sent") and current uppercase ("SENT") DB values
    if (status) query.status = new RegExp(`^${status}$`, "i");

    const result = await NotificationService.listNotifications(
      paginationParams,
      query,
    );

    return ResponseHandler.success(res, result, "general.success", lang);
  } catch (error) {
    logger.error("List notifications error:", error);
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

/**
 * Send a notification via one or more channels (push / email / sms)
 * POST /api/v1/admin/notifications/send
 *
 * Body:
 *   title              string   — notification heading
 *   message            string   — message body
 *   category           string   — 'new_content' | 'subscription_renewal' | 'offer_promo' | 'system_maintenance' | 'approval_rejection'
 *   notificationTypes  string[] — ['push'] | ['email'] | ['sms'] | any combination
 *   sendTo             string   — 'all_users' | 'all_producers' | 'all_subadmins' | 'specifiedUser' | 'userGroup'
 *   recipients         string[] — required when sendTo === 'specifiedUser'
 *   userGroups         string[] — required when sendTo === 'userGroup'
 *   scheduledAt        string?  — ISO datetime for scheduled notifications
 *   dataId             string?  — optional deep-link reference
 */
export const sendNotification = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const senderIdString = req.user?._id || req.user?.sub || (req as any).user?.id;

    if (!senderIdString) {
      return ResponseHandler.error(
        res,
        "auth.unauthorized",
        lang,
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    const senderId = new Types.ObjectId(senderIdString);

    // Normalize inputs
    const sendTo = (req.body.sendTo || req.body.recipientType || "ALL_USERS").toUpperCase();
    const rawRecipients = req.body.recipients || req.body.recipientUserIds || req.body.users || [];
    const recipientsList = Array.isArray(rawRecipients)
      ? rawRecipients.filter((r: any) => r !== undefined && r !== null && String(r).trim() !== "")
      : [rawRecipients].filter(Boolean);

    // Validate recipients
    if (
      (sendTo === "SELECTED_USERS" || sendTo === "SELECTED_PRODUCERS") &&
      recipientsList.length === 0
    ) {
      return ResponseHandler.error(
        res,
        "error.pleaseSelectAtLeastOneRecipientToSendTheNotification",
        lang,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const rawChannels = req.body.notificationTypes || req.body.channels || ["EMAIL", "PUSH"];
    const notificationTypes = Array.isArray(rawChannels)
      ? rawChannels.map((type: string) => String(type).toUpperCase())
      : ["EMAIL", "PUSH"];

    const isScheduled = req.body.scheduledAt
      ? new Date(req.body.scheduledAt) > new Date()
      : false;

    const created = await NotificationService.sendNotification({
      senderId,
      sendTo: sendTo as any,
      notificationTypes: notificationTypes as any,
      category: req.body.category || req.body.type || "SYSTEM_UPDATE",
      title: req.body.title,
      message: req.body.message,
      dataId: req.body.dataId,
      recipients: recipientsList,
      userGroups: req.body.userGroups,
      scheduledAt: req.body.scheduledAt
        ? new Date(req.body.scheduledAt)
        : undefined,
      status: isScheduled ? "SCHEDULED" : "SENT", // Use uppercase: SCHEDULED or SENT
    });

    return ResponseHandler.success(
      res,
      created,
      "Notification sent successfully",
      lang,
      HTTP_STATUS.CREATED,
    );
  } catch (error) {
    logger.error("Send notification error:", error);
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

/**
 * Get notifications for the logged-in user (in-app inbox)
 * GET /api/v1/admin/notifications/my-notifications
 */
export const getMyNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const userIdString = req.user?._id || req.user?.sub || (req as any).user?.id;

    if (!userIdString) {
      return ResponseHandler.error(
        res,
        "auth.unauthorized",
        lang,
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    const userId = new Types.ObjectId(userIdString);
    const paginationParams = PaginationHelper.parseParams(req.query, [
      "createdAt",
    ]);
    const result = await NotificationService.getUserNotifications(
      userId,
      paginationParams,
    );

    return ResponseHandler.success(res, result, "general.success", lang);
  } catch (error) {
    logger.error("Get my notifications error:", error);
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

/**
 * Mark a single notification as read
 * PATCH /api/v1/admin/notifications/:id/mark-read
 */
export const markNotificationAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const userIdString = req.user?._id || req.user?.sub || (req as any).user?.id;

    if (!userIdString) {
      return ResponseHandler.error(
        res,
        "auth.unauthorized",
        lang,
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    const userId = new Types.ObjectId(userIdString);
    const result = await NotificationService.markAsRead(req.params.id, userId);

    return ResponseHandler.success(res, result, "general.success", lang);
  } catch (error) {
    logger.error("Mark notification as read error:", error);
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

/**
 * Mark all notifications as read for the logged-in user
 * PATCH /api/v1/admin/notifications/mark-all-read
 */
export const markAllNotificationsAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const userIdString = req.user?._id || req.user?.sub || (req as any).user?.id;

    if (!userIdString) {
      return ResponseHandler.error(
        res,
        "auth.unauthorized",
        lang,
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    const userId = new Types.ObjectId(userIdString);
    const result = await NotificationService.markAllAsRead(userId);

    return ResponseHandler.success(res, result, "general.success", lang);
  } catch (error) {
    logger.error("Mark all notifications as read error:", error);
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

/**
 * Get unread notification count for the logged-in user
 * GET /api/v1/admin/notifications/unread-count
 */
export const getUnreadCount = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const userIdString = req.user?._id || req.user?.sub || (req as any).user?.id;

    if (!userIdString) {
      return ResponseHandler.error(
        res,
        "auth.unauthorized",
        lang,
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    const userId = new Types.ObjectId(userIdString);
    const result = await NotificationService.getUnreadCount(userId);

    return ResponseHandler.success(res, result, "general.success", lang);
  } catch (error) {
    logger.error("Get unread count error:", error);
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

/**
 * Get a single admin-sent notification by ID, with recipient user details populated.
 * GET /api/v1/admin/notifications/:id
 */
export const getNotificationById = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return ResponseHandler.error(res, "error.invalidId", lang, HTTP_STATUS.BAD_REQUEST);
    }

    // Fetch the notification document
    const notification = await AdminSentNotification.findById(id)
      .populate("senderId", "firstName lastName email")
      .lean();

    if (!notification) {
      return ResponseHandler.error(res, "error.notificationNotFound", lang, HTTP_STATUS.NOT_FOUND);
    }

    // Dynamic fallback calculation for backward compatibility
    if (!notification.recipientCount && notification.recipientUserIds && notification.recipientUserIds.length > 0) {
      (notification as any).recipientCount = notification.recipientUserIds.length;
    }

    // Resolve recipient user details when specific users were targeted
    let recipientUsers: { _id: string; fullName: string; email: string }[] = [];
    if (
      notification.recipientUserIds &&
      notification.recipientUserIds.length > 0
    ) {
      const users = await User.find(
        { _id: { $in: notification.recipientUserIds } },
        "_id firstName lastName fullName email mobile role profileImage",
      ).lean();

      recipientUsers = users.map((u: any) => ({
        _id: u._id.toString(),
        fullName: u.fullName || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "User",
        email: u.email || "",
        mobile: u.mobile || "",
        role: u.role || "USER",
      }));
    }

    return ResponseHandler.success(
      res,
      { notification, recipientUsers },
      "general.success",
      lang,
    );
  } catch (error) {
    logger.error("Get notification by ID error:", error);
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

export default {
  listNotifications,
  sendNotification,
  getNotificationById,
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
};
