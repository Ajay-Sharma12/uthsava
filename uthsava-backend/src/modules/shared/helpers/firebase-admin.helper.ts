import admin from "firebase-admin";
import path from "node:path";
import fs from "node:fs";
import { logger } from "../../../core/constants/logger";
import { config } from "../../../core/config";

/**
 * Firebase Admin Helper
 * Provides low-level Firebase Cloud Messaging functions
 */

export interface FirebaseMessage {
  token: string;
  notification?: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
  android?: admin.messaging.AndroidConfig;
  apns?: admin.messaging.ApnsConfig;
  webpush?: admin.messaging.WebpushConfig;
}

export interface MulticastMessage {
  tokens: string[];
  notification?: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
  android?: admin.messaging.AndroidConfig;
  apns?: admin.messaging.ApnsConfig;
  webpush?: admin.messaging.WebpushConfig;
}

export interface SendResult {
  successCount: number;
  failureCount: number;
  responses?: admin.messaging.SendResponse[];
}

/**
 * Get Firebase service account configuration
 * Priority order:
 * 1. Local firebase.json file in src/core/config/
 * 2. FIREBASE_SERVICE_ACCOUNT_JSON environment variable
 * 3. Individual Firebase environment variables
 */
const getServiceAccount = (): admin.ServiceAccount | null => {
  // Option 1: Try loading from local firebase.json file
  try {
    const firebaseJsonPath = path.resolve(
      __dirname,
      "../../../core/config/firebase.json",
    );
    if (fs.existsSync(firebaseJsonPath)) {
      const serviceAccountFile = fs.readFileSync(firebaseJsonPath, "utf8");
      const serviceAccount = JSON.parse(
        serviceAccountFile,
      ) as admin.ServiceAccount;
      logger.info(
        "Firebase service account loaded from local firebase.json file",
      );
      return serviceAccount;
    }
  } catch (error) {
    logger.warn("Failed to load firebase.json from local file", error);
    // Continue to next option
  }

  // Option 2: Try environment variable with full JSON
  if (config.firebase.serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(
        config.firebase.serviceAccountJson,
      ) as admin.ServiceAccount;
      logger.info(
        "Firebase service account loaded from FIREBASE_SERVICE_ACCOUNT_JSON env variable",
      );
      return serviceAccount;
    } catch (error) {
      logger.error("Invalid FIREBASE_SERVICE_ACCOUNT_JSON", error);
      // Continue to next option
    }
  }

  // Option 3: Try individual environment variables
  if (
    config.firebase.projectId &&
    config.firebase.clientEmail &&
    config.firebase.privateKey
  ) {
    logger.info(
      "Firebase service account loaded from individual env variables",
    );
    return {
      projectId: config.firebase.projectId,
      clientEmail: config.firebase.clientEmail,
      privateKey: config.firebase.privateKey.replaceAll(String.raw`\n`, "\n"),
    };
  }

  return null;
};

/**
 * Initialize Firebase Admin SDK
 */
export const initializeFirebaseAdmin = (): boolean => {
  if (admin.apps.length > 0) {
    logger.info("Firebase Admin already initialized");
    return true;
  }

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) {
    logger.warn(
      "Firebase service account is not configured; Firebase features disabled.",
    );
    return false;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    logger.info("Firebase Admin initialized successfully");
    return true;
  } catch (error) {
    logger.error("Failed to initialize Firebase Admin", error);
    return false;
  }
};

/**
 * Ensure Firebase Admin is initialized
 */
const ensureInitialized = (): boolean => {
  if (admin.apps.length > 0) {
    return true;
  }
  return initializeFirebaseAdmin();
};

/**
 * Send notifications to multiple devices using sendEach
 * Best for sending different messages to different devices
 *
 * @param messages - Array of Firebase messages
 * @param context - Optional context for logging (e.g., user info)
 * @returns Result with success and failure counts
 */
export const sendNotifications = async (
  messages: FirebaseMessage[],
  context?: { userId?: string; mobile?: string; email?: string },
): Promise<SendResult> => {
  if (!messages || messages.length === 0) {
    logger.warn("No messages to send");
    return { successCount: 0, failureCount: 0 };
  }

  if (!ensureInitialized()) {
    logger.error("Firebase Admin not initialized");
    return { successCount: 0, failureCount: messages.length };
  }

  try {
    const result = await admin.messaging().sendEach(messages);

    if (result.failureCount > 0) {
      logger.warn("Some notifications failed to send", {
        failureCount: result.failureCount,
        successCount: result.successCount,
        context,
        errors: result.responses
          .filter((r) => !r.success)
          .map((r) => r.error?.message),
      });
    } else {
      logger.info("All notifications sent successfully", {
        successCount: result.successCount,
        context,
      });
    }

    return {
      successCount: result.successCount,
      failureCount: result.failureCount,
      responses: result.responses,
    };
  } catch (error) {
    logger.error("Error sending push notifications", { error, context });
    return { successCount: 0, failureCount: messages.length };
  }
};

/**
 * Send the same notification to multiple devices using sendMulticast
 * Best for sending the same message to multiple devices
 *
 * @param message - Multicast message with tokens array
 * @param context - Optional context for logging
 * @returns Result with success and failure counts
 */
export const sendMulticast = async (
  message: MulticastMessage,
  context?: { userId?: string; mobile?: string; email?: string },
): Promise<SendResult> => {
  if (!message.tokens || message.tokens.length === 0) {
    logger.warn("No tokens provided for multicast");
    return { successCount: 0, failureCount: 0 };
  }

  if (!ensureInitialized()) {
    logger.error("Firebase Admin not initialized");
    return { successCount: 0, failureCount: message.tokens.length };
  }

  try {
    const result = await admin.messaging().sendEachForMulticast(message);

    if (result.failureCount > 0) {
      logger.warn("Some multicast notifications failed to send", {
        failureCount: result.failureCount,
        successCount: result.successCount,
        context,
        errors: result.responses
          .filter((r) => !r.success)
          .map((r) => r.error?.message),
      });
    } else {
      logger.info("All multicast notifications sent successfully", {
        successCount: result.successCount,
        context,
      });
    }

    return {
      successCount: result.successCount,
      failureCount: result.failureCount,
      responses: result.responses,
    };
  } catch (error) {
    logger.error("Error sending multicast notifications", { error, context });
    return { successCount: 0, failureCount: message.tokens.length };
  }
};

/**
 * Send a single notification to a single device
 *
 * @param message - Firebase message
 * @param context - Optional context for logging
 * @returns Success status and message ID
 */
export const sendSingleNotification = async (
  message: FirebaseMessage,
  context?: { userId?: string; mobile?: string; email?: string },
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  if (!ensureInitialized()) {
    logger.error("Firebase Admin not initialized");
    return { success: false, error: "Firebase not initialized" };
  }

  try {
    const messageId = await admin.messaging().send(message);
    logger.info("Notification sent successfully", { messageId, context });
    return { success: true, messageId };
  } catch (error: any) {
    logger.error("Error sending single notification", { error, context });
    return { success: false, error: error.message };
  }
};

/**
 * Validate Firebase device token
 *
 * @param token - Device token to validate
 * @returns True if token is valid
 */
export const validateDeviceToken = (token: string): boolean => {
  if (!token || typeof token !== "string") {
    return false;
  }

  // Basic validation - token should be non-empty and reasonable length
  return token.trim().length > 20;
};

/**
 * Build Android-specific notification config
 */
export const buildAndroidConfig = (
  title: string,
  body: string,
  channelId: string = "default",
): admin.messaging.AndroidConfig => ({
  priority: "high",
  notification: {
    title,
    body,
    channelId,
    sound: "default",
  },
});

/**
 * Build iOS-specific notification config
 */
export const buildApnsConfig = (
  badge?: number,
): admin.messaging.ApnsConfig => ({
  payload: {
    aps: {
      sound: "default",
      badge: badge || 0,
    },
  },
});

/**
 * Build Web-specific notification config
 */
export const buildWebpushConfig = (
  title: string,
  body: string,
  icon?: string,
): admin.messaging.WebpushConfig => ({
  notification: {
    title,
    body,
    icon: icon || "/icon.png",
  },
});

/**
 * Get Firebase Admin app instance
 */
export const getFirebaseApp = (): admin.app.App | null => {
  if (admin.apps.length > 0) {
    return admin.apps[0] as admin.app.App;
  }
  ensureInitialized();
  return admin.apps.length > 0 ? (admin.apps[0] as admin.app.App) : null;
};

/**
 * Get Firebase Messaging instance
 */
export const getMessaging = (): admin.messaging.Messaging | null => {
  const app = getFirebaseApp();
  return app ? admin.messaging(app) : null;
};
