import { Types } from "mongoose";
import { Notification } from "../../../models";
import {
  PaginationHelper,
  PaginationParams,
} from "../../shared/helpers/pagination.helper";
import { QueryBuilder } from "../../shared/helpers/query-builder.helper";
import { logger } from "../../../core/constants/logger";

const NOTIFICATION_SEARCH_FIELDS = ["title", "description"] as const;

// Base query to exclude soft deleted notifications
const getBaseQuery = () => ({ deletedAt: null });

export class NotificationService {
  /**
   * Get user notifications with pagination (excludes soft deleted)
   */
  static async getUserNotifications(
    userId: Types.ObjectId,
    pagination: PaginationParams,
  ) {
    try {
      const parsedParams = PaginationHelper.parseParams(pagination, [
        "createdAt",
        "title",
      ]);

      const query = { userId, ...getBaseQuery() };

      const result = await PaginationHelper.paginate(
        Notification,
        query,
        parsedParams,
        undefined,
        [{ path: "senderId", select: "firstName lastName email profileImage" }],
      );

      // Get unread count
      const unreadCount = await Notification.countDocuments({
        userId,
        isRead: false,
      });

      return {
        ...result,
        unreadCount,
      };
    } catch (error) {
      logger.error("Get user notifications error:", error);
      throw error;
    }
  }

  /**
   * Get unread notification count (excludes soft deleted)
   */
  static async getUnreadCount(userId: Types.ObjectId): Promise<number> {
    try {
      return await Notification.countDocuments({
        userId,
        isRead: false,
        ...getBaseQuery(),
      });
    } catch (error) {
      logger.error("Get unread count error:", error);
      throw error;
    }
  }

  /**
   * Mark notification as read (only non-deleted)
   */
  static async markAsRead(notificationId: string, userId: Types.ObjectId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId, ...getBaseQuery() },
        { isRead: true },
        { new: true },
      );

      if (!notification) {
        throw new Error("Notification not found");
      }

      return notification;
    } catch (error) {
      logger.error("Mark notification as read error:", error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user (excludes soft deleted)
   */
  static async markAllAsRead(userId: Types.ObjectId) {
    try {
      await Notification.updateMany(
        { userId, isRead: false, ...getBaseQuery() },
        { isRead: true },
      );

      return { success: true };
    } catch (error) {
      logger.error("Mark all notifications as read error:", error);
      throw error;
    }
  }

  /**
   * Soft delete a notification
   * Sets deletedAt timestamp instead of removing from DB
   */
  static async deleteNotification(
    notificationId: string,
    userId: Types.ObjectId,
  ) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { deletedAt: new Date() },
        { new: true },
      );

      if (!notification) {
        throw new Error("Notification not found");
      }

      return { success: true, deletedAt: (notification as any).deletedAt };
    } catch (error) {
      logger.error("Delete notification error:", error);
      throw error;
    }
  }

  /**
   * Soft delete all notifications for a user
   */
  static async deleteAllNotifications(userId: Types.ObjectId) {
    try {
      const result = await Notification.updateMany(
        { userId, ...getBaseQuery() },
        { deletedAt: new Date() },
      );

      return {
        success: true,
        deletedCount: result.modifiedCount,
      };
    } catch (error) {
      logger.error("Delete all notifications error:", error);
      throw error;
    }
  }

  /**
   * Build search query for notification listing
   */
  static buildSearchQuery(search?: string) {
    if (!search) return {};
    return QueryBuilder.buildSearchQuery(search, NOTIFICATION_SEARCH_FIELDS);
  }
}
