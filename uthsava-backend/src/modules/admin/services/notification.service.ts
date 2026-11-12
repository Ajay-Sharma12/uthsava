import { FilterQuery, Types } from "mongoose";
import { AdminSentNotification, Notification, User } from "../../../models";
import {
  NotificationChannel,
  NotificationRecipientType,
  NotificationType,
} from "../../../models/admin-sent-notification.model";
import {
  PaginationHelper,
  PaginationParams,
} from "../../shared/helpers/pagination.helper";
import { QueryBuilder } from "../../shared/helpers/query-builder.helper";
import { logger } from "../../../core/constants/logger";
import { Role } from "../../../common/types/auth.types";
import { UserStatus } from "../../../models/user.model";
import { sendMail } from "../../shared/services/mail.service";
import { sendBulkSms } from "../../shared/services/sms.service";
import { QueueService } from "../../shared/services/queue.service";

const NOTIFICATION_SEARCH_FIELDS = ["title", "message"] as const;

/** Role mapped to each sendTo group */
const SEND_TO_ROLE_MAP: Partial<Record<NotificationRecipientType, string>> = {
  ALL_USERS: Role.USER,
  ALL_PRODUCERS: Role.PRODUCER,
  SELECTED_USERS: Role.USER,
  SELECTED_PRODUCERS: Role.PRODUCER,
  ALL_SUBADMINS: Role.ADMIN_SUB_USER,
};

export interface SendAdminNotificationInput {
  senderId: Types.ObjectId;
  sendTo: NotificationRecipientType;
  notificationTypes: NotificationChannel[];
  category: NotificationType;
  title: string;
  message: string;
  dataId?: string;
  /** Required when sendTo === 'SELECTED_USERS' or 'SELECTED_PRODUCERS' */
  recipients?: any[];
  /** Required when sendTo === 'SELECTED_PRODUCERS' */
  userGroups?: string[];
  scheduledAt?: Date;
  // Status must be UPPERCASE: 'SCHEDULED' | 'SENT' | 'DRAFT' | 'FAILED'
  status: "DRAFT" | "SCHEDULED" | "SENT" | "FAILED";
}

export class NotificationService {
  // ─── List ─────────────────────────────────────────────────────────────────

  static async listNotifications(
    pagination: PaginationParams,
    query: FilterQuery<any> = {},
  ) {
    try {
      const parsedParams = PaginationHelper.parseParams(pagination, [
        "createdAt",
        "title",
        "sendTo",
        "recipientCount",
      ]);
      const result = await PaginationHelper.paginate(
        AdminSentNotification,
        query,
        parsedParams,
      );

      if (result && Array.isArray(result.data)) {
        result.data = result.data.map((item: any) => {
          const doc = typeof item.toObject === "function" ? item.toObject() : item;
          if (!doc.recipientCount && doc.recipientUserIds && doc.recipientUserIds.length > 0) {
            doc.recipientCount = doc.recipientUserIds.length;
          }
          return doc;
        });
      }

      return result;
    } catch (error) {
      logger.error("List notifications error:", error);
      throw error;
    }
  }

  // ─── Send Notification ────────────────────────────────────────────────────

  /**
   * Send an admin notification via the requested channels (push, email, sms)
   * to the target audience. Supports immediate and scheduled sending.
   */
  static async sendNotification(input: SendAdminNotificationInput) {
    const {
      senderId,
      sendTo,
      notificationTypes,
      category,
      title,
      message,
      dataId,
      recipients,
      userGroups,
      scheduledAt,
      status,
    } = input;

    // 1. Resolve target users ─────────────────────────────────────────────────
    const targetUsers = await NotificationService._resolveTargetUsers(
      sendTo,
      recipients,
      userGroups,
    );

    if (targetUsers.length === 0) {
      logger.warn(
        `[Notification] No active recipients found for sendTo="${sendTo}"`,
      );
    }

    // 2. Persist the admin broadcast record ───────────────────────────────────
    const adminNotification = await AdminSentNotification.create({
      senderId,
      recipientType: sendTo,
      channels: notificationTypes,
      type: category,
      title,
      message,
      dataId: dataId || null,
      recipientUserIds:
        sendTo === NotificationRecipientType.SELECTED_USERS ||
        sendTo === NotificationRecipientType.SELECTED_PRODUCERS
          ? targetUsers.map((u: any) => u._id)
          : [],
      status,
      scheduledAt: scheduledAt || null,
      recipientCount: targetUsers.length,
    });

    // If scheduled for future, don't send now
    if (
      status === "SCHEDULED" &&
      scheduledAt &&
      new Date(scheduledAt) > new Date()
    ) {
      logger.info(
        `[Notification] Scheduled notification created for ${scheduledAt}`,
      );
      return adminNotification;
    }

    if (targetUsers.length === 0) {
      await AdminSentNotification.findByIdAndUpdate(adminNotification._id, {
        sentAt: new Date(),
        status: "FAILED",
        failureCount: recipients?.length || 1,
        failureReason: "No active recipient found for selected audience. Target users may be inactive or deleted.",
      });
      return adminNotification;
    }

    // 3. Dispatch channels in parallel ────────────────────────────────────────
    const results = await Promise.allSettled([
      notificationTypes.includes(NotificationChannel.PUSH)
        ? NotificationService._sendPush(
          targetUsers,
          senderId,
          title,
          message,
          dataId,
          sendTo,
        )
        : Promise.resolve({ succeeded: 0, failed: 0 }),

      notificationTypes.includes(NotificationChannel.EMAIL)
        ? NotificationService._sendEmail(targetUsers, title, message)
        : Promise.resolve({ succeeded: 0, failed: 0 }),

      notificationTypes.includes(NotificationChannel.SMS)
        ? NotificationService._sendSms(targetUsers, title, message)
        : Promise.resolve({ succeeded: 0, failed: 0 }),
    ]);

    // Calculate totals & failure reasons
    let totalSucceeded = 0;
    let totalFailed = 0;
    const failureMessages: string[] = [];

    const channelList = [
      NotificationChannel.PUSH,
      NotificationChannel.EMAIL,
      NotificationChannel.SMS,
    ].filter((ch) => notificationTypes.includes(ch));

    results.forEach((result, idx) => {
      const channelName = channelList[idx] || "CHANNEL";
      if (result.status === "fulfilled" && result.value) {
        totalSucceeded += result.value.succeeded || 0;
        totalFailed += result.value.failed || 0;
        if (result.value.failed > 0) {
          failureMessages.push(`${channelName}: ${result.value.failed} recipient(s) failed`);
        }
      } else if (result.status === "rejected") {
        totalFailed += targetUsers.length;
        failureMessages.push(`${channelName}: ${result.reason?.message || "Dispatch error"}`);
      }
    });

    const failureReason = failureMessages.length > 0 ? failureMessages.join(" • ") : undefined;

    // Update notification with success/failure counts
    // Status must be uppercase to match the DB schema enum (SENT | FAILED)
    await AdminSentNotification.findByIdAndUpdate(adminNotification._id, {
      sentAt: new Date(),
      successCount: totalSucceeded,
      failureCount: totalFailed,
      failureReason,
      status: totalFailed > 0 && totalSucceeded === 0 ? "FAILED" : "SENT",
    });

    return adminNotification;
  }

  /**
   * Dispatch an automated system notification using the latest configured AdminSentNotification template.
   */
  static async dispatchSystemNotification(
    type: NotificationType,
    targetUsers: any[],
    replacements: Record<string, string> = {}
  ) {
    if (!targetUsers || targetUsers.length === 0) return;

    // 1. Fetch latest template for this type
    const template = await AdminSentNotification.findOne({ type }).sort({ createdAt: -1 }).lean();

    if (!template) {
      logger.warn(`[Notification] No template found for ${type}. Automated notification skipped.`);
      return;
    }

    let title = template.title || "";
    let message = template.message || "";

    // 2. Perform dynamic replacements
    for (const [key, value] of Object.entries(replacements)) {
      title = title.replaceAll(`{{${key}}}`, value);
      message = message.replaceAll(`{{${key}}}`, value);
    }

    // 3. Dispatch channels in parallel
    const results = await Promise.allSettled([
      template.channels.includes(NotificationChannel.PUSH)
        ? NotificationService._sendPush(
          targetUsers,
          template.senderId as any,
          title,
          message,
          template.dataId,
        )
        : Promise.resolve({ succeeded: 0, failed: 0 }),

      template.channels.includes(NotificationChannel.EMAIL)
        ? NotificationService._sendEmail(targetUsers, title, message)
        : Promise.resolve({ succeeded: 0, failed: 0 }),

      template.channels.includes(NotificationChannel.SMS)
        ? NotificationService._sendSms(targetUsers, title, message)
        : Promise.resolve({ succeeded: 0, failed: 0 }),
    ]);

    let totalSucceeded = 0;
    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value) {
        totalSucceeded += result.value.succeeded || 0;
      }
    });

    logger.info(`[Notification] System notification ${type} dispatched to ${totalSucceeded} targets.`);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * Fetch active users for the given sendTo target.
   *
   * NOTE: deviceToken / notificationEnabled live on the AppUser discriminator,
   * but Mongoose resolves discriminator fields correctly when queried via the
   * base User model as long as the fields are projected.  We must NOT filter
   * by status === ACTIVE for specifiedUser because Admin/Sub-admin users use
   * the base User model and their status field works the same way.
   */
  private static async _resolveTargetUsers(
    sendTo: NotificationRecipientType,
    specifiedIds?: Types.ObjectId[],
    userGroups?: string[],
  ) {
    // deviceToken & notificationEnabled come from the AppUser discriminator
    // schema. Querying via the base User model still returns those fields
    // because they are stored on the same document.
    const select =
      "_id email mobile notificationEnabled deviceToken deviceType countryCode role status";

    const nonDeletedStatusQuery = {
      $nin: [UserStatus.DELETED, "DELETED", "deleted"],
    };

    if (
      sendTo === NotificationRecipientType.SUBSCRIBED_USERS ||
      sendTo === NotificationRecipientType.FREE_USERS
    ) {
      const { UserSubscription } = await import(
        "../../../models/user-subscription.model"
      );
      const activeSubscriptions = await UserSubscription.find({
        status: { $in: ["ACTIVE", "active"] },
      })
        .select("userId")
        .lean();
      const subscribedUserIds = activeSubscriptions.map((s: any) => s.userId);

      const query: any = {
        role: { $in: [Role.USER, "user", "USER"] },
        status: nonDeletedStatusQuery,
      };
      if (sendTo === NotificationRecipientType.SUBSCRIBED_USERS) {
        query._id = { $in: subscribedUserIds };
      } else {
        query._id = { $nin: subscribedUserIds };
      }
      return User.find(query).select(select).lean();
    }

    if (
      sendTo === NotificationRecipientType.SELECTED_USERS ||
      sendTo === NotificationRecipientType.SELECTED_PRODUCERS
    ) {
      const ids = specifiedIds || [];
      const objectIds = ids
        .filter((id: any) => Types.ObjectId.isValid(String(id)))
        .map((id: any) => new Types.ObjectId(String(id)));

      const emailStrings = ids
        .map((id: any) => String(id).trim())
        .filter((id: string) => id.includes("@"));

      const numericIds = ids
        .map((id: any) => {
          const s = String(id).trim();
          return /^\d+$/.test(s) ? Number(s) : null;
        })
        .filter((n: number | null): n is number => n !== null && !isNaN(n));

      const orConditions: any[] = [];
      if (objectIds.length > 0) {
        orConditions.push({ _id: { $in: objectIds } });
      }
      if (numericIds.length > 0) {
        orConditions.push({ userId: { $in: numericIds } });
      }
      if (emailStrings.length > 0) {
        orConditions.push({ email: { $in: emailStrings } });
      }

      if (orConditions.length === 0) {
        return [];
      }

      return User.find({
        $or: orConditions,
        status: nonDeletedStatusQuery,
      })
        .select(select)
        .lean();
    }

    let roleQuery: any;
    if (sendTo === NotificationRecipientType.ALL_USERS) {
      roleQuery = { $in: [Role.USER, "user", "USER"] };
    } else if (sendTo === NotificationRecipientType.ALL_PRODUCERS) {
      roleQuery = { $in: [Role.PRODUCER, "producer", "PRODUCER"] };
    } else if (sendTo === NotificationRecipientType.ALL_SUBADMINS) {
      roleQuery = {
        $in: [
          Role.ADMIN_SUB_USER,
          "admin_sub_user",
          "ADMIN_SUB_USER",
          "subadmin",
          "SUBADMIN",
        ],
      };
    } else {
      const mappedRole = (SEND_TO_ROLE_MAP as Record<string, string | undefined>)[sendTo];
      if (!mappedRole) {
        logger.warn(`[Notification] No role mapped for sendTo="${sendTo}"`);
        return [];
      }
      roleQuery = {
        $in: [mappedRole, String(mappedRole).toLowerCase(), String(mappedRole).toUpperCase()],
      };
    }

    const users = await User.find({
      role: roleQuery,
      status: nonDeletedStatusQuery,
    })
      .select(select)
      .lean();

    logger.info(
      `[Notification] ${sendTo} resolved ${users.length} users. ` +
        `Emails present: ${users.filter((u: any) => u.email).length}, ` +
        `Tokens present: ${users.filter((u: any) => u.deviceToken).length}`,
    );
    return users;
  }

  /**
   * Save in-app notification records and send Firebase push to all targets.
   *
   * BUG FIX: Previously this called sendNotificationToMultipleUsers() with
   * only user IDs, which re-fetched each user from the base User model and
   * often got null deviceToken/deviceType (discriminator fields not returned).
   * Now we pass the already-resolved user objects directly to avoid that.
   */
  private static async _sendPush(
    targetUsers: any[],
    senderId: Types.ObjectId,
    title: string,
    message: string,
    dataId?: string,
    sendTo?: string,
  ) {
    try {
      // Bulk-insert in-app notification records
      const records = targetUsers.map((u) => ({
        userId: u._id,
        senderId,
        title,
        message: message,
        type: "SYSTEM_NOTIFICATION",
        contentId: dataId || undefined,
        isRead: false,
      }));
      await Notification.insertMany(records, { ordered: false });

      // Fire push notifications using already-resolved token data
      const { sendPushNotificationToUser } = await import(
        "../../shared/helpers/notification.helper"
      );

      const pushResults = await Promise.allSettled(
        targetUsers.map((u) => {
          const hasToken = !!u.deviceToken;
          logger.info(
            `[Notification] User ${u._id} deviceToken=${hasToken ? "present" : "MISSING"} deviceType=${u.deviceType || "MISSING"} notificationEnabled=${u.notificationEnabled}`,
          );

          return sendPushNotificationToUser({
            receiverUserId: u._id,
            title,
            description: message,
            senderId,
            dataId,
            deviceToken: u.deviceToken,
            deviceType: u.deviceType,
            notificationEnabled: u.notificationEnabled !== false, // default true
            data: {
              type: "admin_notification",
              sendTo: sendTo || "",
            },
            saveToDb: false, // already saved above
            emitSocket: true,
          });
        }),
      );

      const succeeded = pushResults.filter(
        (r) =>
          r.status === "fulfilled" &&
          r.value.success &&
          r.value.failed === 0,
      ).length;
      const failed = pushResults.length - succeeded;

      logger.info(
        `[Notification] Push sent ${succeeded}/${pushResults.length} (failed: ${failed})`,
      );
      return { succeeded, failed };
    } catch (error) {
      logger.error("[Notification] Push dispatch error:", error);
      return { succeeded: 0, failed: targetUsers.length };
    }
  }

  /**
   * Send email notifications to all targets that have an email address.
   */
  private static async _sendEmail(
    targetUsers: any[],
    title: string,
    message: string,
  ) {
    const isDummyEmail = (email: string) => {
      if (!email || typeof email !== "string") return true;
      const e = email.toLowerCase().trim();
      return (
        !e.includes("@") ||
        e.endsWith("@example.com") ||
        e.endsWith("@example.org") ||
        e.endsWith("@example.net") ||
        e.endsWith(".example") ||
        e.endsWith(".invalid") ||
        e.endsWith(".test") ||
        e.endsWith("@localhost")
      );
    };

    const usersWithEmail = targetUsers.filter(
      (u) => !!u.email && !isDummyEmail(u.email),
    );
    if (!usersWithEmail.length) {
      logger.info("[Notification] No valid email addresses found for target recipients.");
      return { succeeded: 0, failed: 0 };
    }

    logger.info(`[Notification] Dispatching email to ${usersWithEmail.length} user(s)...`);

    const emailResults = await Promise.allSettled(
      usersWithEmail.map(async (u, i) => {
        const emailHtml = `
          <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
            <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin-bottom: 16px; line-height: 1.4;">${title}</h2>
            <div style="color: #374151; font-size: 15px; line-height: 1.6; white-space: pre-wrap; background: #f8fafc; padding: 18px 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
              ${message}
            </div>
            <p style="margin-top: 24px; font-size: 13px; color: #6b7280; text-align: center;">
              This update was sent from your Uthsava account notification center.
            </p>
          </div>
        `;

        const subject =
          title.startsWith("Uthsava") ||
          title.startsWith("[Uthsava]") ||
          title.startsWith("🔔")
            ? title
            : `[Uthsava] ${title}`;

        const mailResult: any = await sendMail(u.email, subject, emailHtml);
        if (
          mailResult &&
          mailResult.messageId &&
          !mailResult.messageId.startsWith("<failed-") &&
          !mailResult.messageId.startsWith("<invalid-recipient-")
        ) {
          logger.info(`[Notification] [${i + 1}/${usersWithEmail.length}] Email successfully sent to ${u.email}`);
          return { email: u.email, success: true };
        } else {
          logger.warn(`[Notification] [${i + 1}/${usersWithEmail.length}] Email dispatch failed for ${u.email}`);
          throw new Error(`Email delivery failed for ${u.email}`);
        }
      }),
    );

    const succeeded = emailResults.filter((r) => r.status === "fulfilled").length;
    const failed = emailResults.length - succeeded;

    logger.info(
      `[Notification] Email dispatched ${succeeded}/${usersWithEmail.length} (failed: ${failed})`,
    );
    return { succeeded, failed };
  }

  /**
   * Send SMS notifications to all targets that have a mobile number.
   */
  private static async _sendSms(
    targetUsers: any[],
    title: string,
    message: string,
  ) {
    const mobiles = targetUsers
      .filter((u) => !!u.mobile)
      .map((u) => {
        // Prepend country code if stored separately; fall back to raw mobile
        const cc = u.countryCode ? `+${u.countryCode}` : "";
        return `${cc}${u.mobile}`;
      });

    if (!mobiles.length) return { succeeded: 0, failed: 0 };

    const smsBody = `${title}\n${message}`;
    const result = await sendBulkSms(mobiles, smsBody);
    logger.info(
      `[Notification] SMS sent ${result.succeeded}/${result.total} (failed: ${result.failed})`,
    );
    return { succeeded: result.succeeded, failed: result.failed };
  }

  // ─── User-facing helpers ──────────────────────────────────────────────────

  static buildSearchQuery(search?: string) {
    if (!search) return {};
    return QueryBuilder.buildSearchQuery(search, NOTIFICATION_SEARCH_FIELDS);
  }

  static async getUserNotifications(
    userId: Types.ObjectId,
    pagination: PaginationParams,
  ) {
    try {
      const parsedParams = PaginationHelper.parseParams(pagination, [
        "createdAt",
      ]);
      const result = await PaginationHelper.paginate(
        Notification,
        { userId },
        parsedParams,
        undefined,
        [{ path: "senderId", select: "firstName lastName email profileImage" }],
      );
      const unreadCount = await Notification.countDocuments({
        userId,
        isRead: false,
      });
      return { ...result, unreadCount };
    } catch (error) {
      logger.error("Get user notifications error:", error);
      throw error;
    }
  }

  static async markAsRead(notificationId: string, userId: Types.ObjectId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { isRead: true },
        { new: true },
      );
      if (!notification) throw new Error("error.notificationNotFound");
      return notification;
    } catch (error) {
      logger.error("Mark notification as read error:", error);
      throw error;
    }
  }

  static async markAllAsRead(userId: Types.ObjectId) {
    try {
      await Notification.updateMany(
        { userId, isRead: false },
        { isRead: true },
      );
      return { success: true };
    } catch (error) {
      logger.error("Mark all notifications as read error:", error);
      throw error;
    }
  }

  static async getUnreadCount(userId: Types.ObjectId) {
    try {
      const count = await Notification.countDocuments({
        userId,
        isRead: false,
      });
      return { count };
    } catch (error) {
      logger.error("Get unread count error:", error);
      throw error;
    }
  }
}
