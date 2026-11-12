import { Request, Response } from "express";
import { Types } from "mongoose";
import { ResponseHandler } from "../../../common/responses/response.handler";
import { getLanguage } from "../../shared/helpers/language.helper";
import { PaginationHelper } from "../../shared/helpers/pagination.helper";
import { NotificationService } from "../services/notification.service";
import { logger } from "../../../core/constants/logger";
import { HTTP_STATUS } from "../../../core/constants/app.constants";
import { JwtPayload } from "../../../common/types/auth.types";

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * Get user notifications
 * Returns paginated list of notifications for the authenticated user
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
        "Unauthorized",
        lang,
        HTTP_STATUS.UNAUTHORIZED,
        new Error("User not authenticated"),
      );
    }

    const userId = new Types.ObjectId(userIdString);
    const paginationParams = PaginationHelper.parseParams(req.query, [
      "createdAt",
      "title",
    ]);

    logger.info("Get my notifications request:", {
      userId,
      page: req.query.page,
      limit: req.query.limit,
    });

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
 * Get unread notification count
 * Returns count of unread notifications for the authenticated user
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
        "Unauthorized",
        lang,
        HTTP_STATUS.UNAUTHORIZED,
        new Error("User not authenticated"),
      );
    }

    const userId = new Types.ObjectId(userIdString);

    logger.info("Get unread count request:", { userId });

    const count = await NotificationService.getUnreadCount(userId);

    return ResponseHandler.success(res, { count }, "general.success", lang);
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
 * Mark notification as read
 * Marks a specific notification as read for the authenticated user
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
        "Unauthorized",
        lang,
        HTTP_STATUS.UNAUTHORIZED,
        new Error("User not authenticated"),
      );
    }

    const userId = new Types.ObjectId(userIdString);
    const notificationId = req.params.id;

    logger.info("Mark notification as read request:", {
      userId,
      notificationId,
    });

    const result = await NotificationService.markAsRead(notificationId, userId);

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
 * Mark all notifications as read
 * Marks all notifications as read for the authenticated user
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
        "Unauthorized",
        lang,
        HTTP_STATUS.UNAUTHORIZED,
        new Error("User not authenticated"),
      );
    }

    const userId = new Types.ObjectId(userIdString);

    logger.info("Mark all notifications as read request:", { userId });

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
 * Delete a notification (soft delete)
 * Soft deletes a specific notification for the authenticated user
 */
export const deleteNotification = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const userIdString = req.user?._id || req.user?.sub || (req as any).user?.id;

    if (!userIdString) {
      return ResponseHandler.error(
        res,
        "Unauthorized",
        lang,
        HTTP_STATUS.UNAUTHORIZED,
        new Error("User not authenticated"),
      );
    }

    const userId = new Types.ObjectId(userIdString);
    const notificationId = req.params.id;

    logger.info("Delete notification request:", { userId, notificationId });

    const result = await NotificationService.deleteNotification(
      notificationId,
      userId,
    );

    return ResponseHandler.success(res, result, "general.success", lang);
  } catch (error) {
    logger.error("Delete notification error:", error);
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
 * Delete all notifications (soft delete)
 * Soft deletes all notifications for the authenticated user
 */
export const deleteAllNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const userIdString = req.user?._id || req.user?.sub || (req as any).user?.id;

    if (!userIdString) {
      return ResponseHandler.error(
        res,
        "Unauthorized",
        lang,
        HTTP_STATUS.UNAUTHORIZED,
        new Error("User not authenticated"),
      );
    }

    const userId = new Types.ObjectId(userIdString);

    logger.info("Delete all notifications request:", { userId });

    const result = await NotificationService.deleteAllNotifications(userId);

    return ResponseHandler.success(res, result, "general.success", lang);
  } catch (error) {
    logger.error("Delete all notifications error:", error);
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
