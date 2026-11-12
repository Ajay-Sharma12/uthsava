import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";
import { Types } from "mongoose";
import { config } from "../../../core/config";
import { logger } from "../../../core/constants/logger";
import { Notification, User, IUser, INotification } from "../../../models";

export type DeviceType = "web" | "android" | "ios";
export type NotificationDataValue = string | number | boolean;

export interface NotificationDevice {
  token: string;
  type: DeviceType;
}

export interface SendNotificationInput {
  userId?: Types.ObjectId;
  devices: NotificationDevice[];
  title: string;
  description: string;
  data?: Record<string, NotificationDataValue>;
  saveToDb?: boolean;
}

export interface CreateNotificationInput {
  receiverUserId: Types.ObjectId | string;
  senderId?: Types.ObjectId | string;
  title: string;
  description: string;
  type?: string;
  dataId?: string;
  additionalData?: Record<string, any>;
}

export interface SendPushNotificationInput {
  receiverUserId: Types.ObjectId | string;
  title: string;
  description: string;
  type?: string;
  senderId?: Types.ObjectId | string;
  dataId?: string;
  deviceToken?: string;
  deviceType?: DeviceType;
  notificationEnabled?: boolean;
  data?: Record<string, NotificationDataValue>;
  saveToDb?: boolean;
  emitSocket?: boolean;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: number;
}

const _isRegistrationTokenNotRegisteredError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;

  const firebaseError = error as {
    errorInfo?: { code?: string };
    code?: string;
  };
  return (
    firebaseError?.errorInfo?.code ===
      "messaging/registration-token-not-registered" ||
    firebaseError?.code === "messaging/registration-token-not-registered"
  );
};

const normalizeData = (
  data?: Record<string, NotificationDataValue>,
): Record<string, string> | undefined => {
  if (!data) return undefined;
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, String(value)]),
  );
};

const getServiceAccount = (): admin.ServiceAccount | null => {
  try {
    const firebaseJsonPath = path.resolve(
      __dirname,
      "../../../core/config/firebase.json",
    );
    if (fs.existsSync(firebaseJsonPath)) {
      const serviceAccountFile = fs.readFileSync(firebaseJsonPath, "utf8");
      return JSON.parse(serviceAccountFile) as admin.ServiceAccount;
    }
  } catch (error) {
    logger.warn("Failed to load firebase.json from local file", error);
  }

  if (config.firebase.serviceAccountJson) {
    try {
      return JSON.parse(
        config.firebase.serviceAccountJson,
      ) as admin.ServiceAccount;
    } catch (error) {
      logger.error("Invalid FIREBASE_SERVICE_ACCOUNT_JSON", error);
      return null;
    }
  }

  if (
    !config.firebase.projectId ||
    !config.firebase.clientEmail ||
    !config.firebase.privateKey
  ) {
    return null;
  }

  return {
    projectId: config.firebase.projectId,
    clientEmail: config.firebase.clientEmail,
    privateKey: config.firebase.privateKey.split(String.raw`\n`).join("\n"),
  };
};

const ensureFirebaseApp = () => {
  if (admin.apps.length) return;

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) {
    logger.warn(
      "Firebase service account is not configured; notifications disabled.",
    );
    return;
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
};

const buildMessage = (
  device: NotificationDevice,
  title: string,
  description: string,
  data?: Record<string, string>,
  badgeCount?: number,
): admin.messaging.Message => {
  // ✅ WEB

  if (device.type === "web") {
    const baseUrl = config.backendUrl || "";
    return {
      token: device.token,
      webpush: {
        notification: {
          title,
          body: description,
          icon: `${baseUrl}/logo.svg`,
          image: `${baseUrl}/logo.svg`,
          badge: `${baseUrl}/logo.svg`,
        },
      },
      data,
    };
  }

  // ✅ ANDROID
  if (device.type === "android") {
    return {
      token: device.token,
      android: {
        priority: "high",
        notification: {
          title,
          body: description,
          channelId: "default",
        },
      },
      data,
    };
  }

  // ✅ IOS
  if (device.type === "ios") {
    return {
      token: device.token,
      apns: {
        payload: {
          aps: {
            alert: {
              title,
              body: description,
            },
            sound: "default",
            badge: badgeCount || 0,
          },
        },
      },
      data,
      notification: {
        title,
        body: description,
      },
    };
  }

  // Fallback (should not happen)
  return {
    token: device.token,
    notification: { title, body: description },
    data,
  };
};

/**
 * Send a single Firebase push notification to a device.
 * Handles Firebase init check, badge count, and token cleanup on error.
 */
const sendFirebasePush = async (
  receiverUserId: Types.ObjectId | string,
  device: NotificationDevice,
  title: string,
  description: string,
  payloadData?: Record<string, string>,
): Promise<{ sent: number; failed: number }> => {
  ensureFirebaseApp();

  if (!admin.apps.length) {
    console.warn("[Notification] Firebase not initialized. Push not sent.");
    return { sent: 0, failed: 0 };
  }

  const unreadCount = await getUnreadNotificationCount(receiverUserId);

  try {
    const message = buildMessage(
      device,
      title,
      description,
      payloadData,
      unreadCount,
    );
    await admin.messaging().send(message);
    return { sent: 1, failed: 0 };
  } catch (error) {
    logger.error("Failed to send push notification", error);

    if (_isRegistrationTokenNotRegisteredError(error)) {
      await User.updateOne(
        { _id: receiverUserId },
        { $set: { deviceToken: null, deviceType: null } },
      );
      console.warn(
        "[Notification] Removed invalid device token from user profile",
      );
    }

    console.error("[Notification] Push send failed");
    return { sent: 0, failed: 1 };
  }
};

export const sendNotification = async ({
  userId,
  devices,
  title,
  description,
  data,
  saveToDb = true,
}: SendNotificationInput) => {
  let badgeCount = 0;

  if (saveToDb && userId) {
    await Notification.create({
      userId,
      senderId: userId, // Default to same user if not specified
      title,
      description,
    });

    // Get unread notification count for badge
    badgeCount = await Notification.countDocuments({
      userId,
      isRead: false,
    });
  }

  if (!devices.length) {
    return { sent: 0, failed: 0 };
  }

  ensureFirebaseApp();
  if (!admin.apps.length) {
    return { sent: 0, failed: devices.length };
  }

  const payloadData = normalizeData(data);
  const results = await Promise.all(
    devices.map(async (device) => {
      try {
        const message = buildMessage(
          device,
          title,
          description,
          payloadData,
          badgeCount,
        );
        await admin.messaging().send(message);
        return { ok: true };
      } catch (error) {
        logger.error("Failed to send notification", error);
        return { ok: false };
      }
    }),
  );

  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;

  return { sent, failed };
};

/**
 * Create a notification record in the database
 */
export const createNotification = async ({
  receiverUserId,
  senderId,
  title,
  description,
  type,
  dataId,
}: CreateNotificationInput): Promise<void> => {
  try {
    await Notification.create({
      userId: receiverUserId,
      senderId: senderId || receiverUserId,
      title,
      description,
      type: type || null,
      dataId: dataId || null,
    });
  } catch (error) {
    logger.error("Failed to create notification", error);
    throw error;
  }
};

/**
 * Get unread notification count for a user
 */
export const getUnreadNotificationCount = async (
  userId: Types.ObjectId | string,
): Promise<number> => {
  try {
    return await Notification.countDocuments({
      userId,
      isRead: false,
    });
  } catch (error) {
    logger.error("Failed to get unread notification count", error);
    return 0;
  }
};

/**
 * Get the latest unread notification for a user
 */
export const getLatestUnreadNotification = async (
  userId: Types.ObjectId | string,
) => {
  try {
    return await Notification.findOne({
      userId,
      isRead: false,
    }).sort({ createdAt: -1 });
  } catch (error) {
    logger.error("Failed to get latest unread notification", error);
    return null;
  }
};

/**
 * Emit socket event for new notification (if socket.io is configured)
 */
export const emitNotificationSocket = async (
  userId: Types.ObjectId | string,
): Promise<void> => {
  try {
    const latestNotification = await getLatestUnreadNotification(userId);
    const unreadCount = await getUnreadNotificationCount(userId);

    // Check if socket.io is configured and user is connected
    const userSocket = (globalThis as any)?.sockets?.[userId.toString()];

    if (userSocket) {
      userSocket.emit("hasNewNotification", {
        success: true,
        hasNewNotification: true,
        count: unreadCount,
        notificationData: latestNotification,
      });

      if (latestNotification) {
        userSocket.emit("newNotificationMessage", {
          success: true,
          newNotificationMessage: true,
          message: (latestNotification as any).description || "",
        });
      }
    }
  } catch (error) {
    logger.error("Failed to emit notification socket event", error);
  }
};

/**
 * Send push notification to a specific user
 * This is a comprehensive function that handles:
 * - Creating notification in DB
 * - Sending push notification to device
 * - Emitting socket events
 */
export const sendPushNotificationToUser = async ({
  receiverUserId,
  title,
  description,
  type,
  senderId,
  dataId,
  deviceToken,
  deviceType,
  notificationEnabled = true,
  data,
  saveToDb = true,
  emitSocket = true,
}: SendPushNotificationInput): Promise<{
  success: boolean;
  sent: number;
  failed: number;
}> => {
  try {
    if (saveToDb) {
      await createNotification({
        receiverUserId,
        senderId,
        title,
        description,
        type,
        dataId,
      });
    }

    let sent = 0;
    let failed = 0;

    if (notificationEnabled && deviceToken && deviceType) {
      const payloadData = normalizeData(data);
      const device: NotificationDevice = {
        token: deviceToken,
        type: deviceType,
      };
      const result = await sendFirebasePush(
        receiverUserId,
        device,
        title,
        description,
        payloadData,
      );
      sent = result.sent;
      failed = result.failed;
    } else {
      // Log exactly WHY the push was skipped so it is easy to debug
      const reasons: string[] = [];
      if (!notificationEnabled) reasons.push("notificationEnabled=false");
      if (!deviceToken) reasons.push("deviceToken is null/empty");
      if (!deviceType) reasons.push("deviceType is null/empty");
      logger.warn(
        `[Notification] Push skipped for userId=${receiverUserId?.toString()} — ${reasons.join(", ")}`,
      );
    }

    if (emitSocket) {
      await emitNotificationSocket(receiverUserId);
    }

    return { success: true, sent, failed };
  } catch (error) {
    logger.error("Failed to send push notification to user", error);
    return { success: false, sent: 0, failed: 1 };
  }
};

/**
 * Send notification to multiple users
 * NOTE: If you already have user objects with deviceToken/deviceType resolved,
 * prefer calling sendPushNotificationToUser() directly per user to avoid an
 * extra DB round-trip per user.
 */
export const sendNotificationToMultipleUsers = async (
  userIds: (Types.ObjectId | string)[],
  title: string,
  description: string,
  options?: {
    senderId?: Types.ObjectId | string;
    type?: string;
    dataId?: string;
    data?: Record<string, NotificationDataValue>;
    saveToDb?: boolean;
    emitSocket?: boolean;
  },
): Promise<{ total: number; succeeded: number; failed: number }> => {
  const results = await Promise.allSettled(
    userIds.map(async (userId) => {
      // Fetch user — .lean() on base User model returns discriminator fields too
      const user = await User.findById(userId)
        .select("notificationEnabled deviceToken deviceType")
        .lean() as any as IUser;

      logger.info(
        `[Notification] sendNotificationToMultipleUsers userId=${userId?.toString()} ` +
          `deviceToken=${user?.deviceToken ? "present" : "MISSING"} ` +
          `deviceType=${user?.deviceType || "MISSING"} ` +
          `notificationEnabled=${user?.notificationEnabled}`,
      );

      const sendResult = await sendPushNotificationToUser({
        receiverUserId: userId,
        title,
        description,
        type: options?.type,
        senderId: options?.senderId,
        dataId: options?.dataId,
        deviceToken: user?.deviceToken,
        deviceType: user?.deviceType as DeviceType | undefined,
        notificationEnabled: user?.notificationEnabled,
        data: options?.data,
        saveToDb: options?.saveToDb ?? true,
        emitSocket: options?.emitSocket ?? true,
      });

      return sendResult;
    }),
  );

  const succeeded = results.filter(
    (r) => r.status === "fulfilled" && r.value.success && r.value.failed === 0,
  ).length;
  const failed = results.filter(
    (r) =>
      r.status === "rejected" ||
      (r.status === "fulfilled" && (!r.value.success || r.value.failed > 0)),
  ).length;

  return { total: userIds.length, succeeded, failed };
};
