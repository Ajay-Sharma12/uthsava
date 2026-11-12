import admin from "firebase-admin";
import {
  initializeFirebaseAdmin,
  sendNotifications,
  sendMulticast,
  sendSingleNotification,
  validateDeviceToken,
  buildAndroidConfig,
  buildApnsConfig,
  buildWebpushConfig,
  getFirebaseApp,
  getMessaging,
} from "../../../../src/modules/shared/helpers/firebase-admin.helper";
import { logger } from "../../../../src/core/constants/logger";

jest.mock("firebase-admin", () => {
  const mockSendEach = jest.fn();
  const mockSendEachForMulticast = jest.fn();
  const mockSend = jest.fn();
  const mockMessaging = jest.fn().mockReturnValue({
    sendEach: mockSendEach,
    sendEachForMulticast: mockSendEachForMulticast,
    send: mockSend,
  });

  return {
    apps: [] as any[],
    initializeApp: jest.fn().mockImplementation(() => {
      (admin as any).apps.push({ name: "[DEFAULT]" });
    }),
    credential: {
      cert: jest.fn().mockReturnValue({}),
    },
    messaging: mockMessaging,
  };
});

jest.mock("../../../../src/core/config", () => ({
  config: {
    firebase: {
      projectId: "mock-project",
      clientEmail: "mock-client@email.com",
      privateKey: "mock-private-key",
      serviceAccountJson: "",
    },
  },
}));

jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("Firebase Admin Helper Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (admin.apps as any[]).length = 0; // Reset app list
  });

  /* =========================================================================
   * INITIALIZATION TESTS
   * ========================================================================= */
  describe("initializeFirebaseAdmin", () => {
    it("[Positive] should successfully initialize Firebase Admin SDK", () => {
      const initialized = initializeFirebaseAdmin();

      expect(initialized).toBe(true);
      expect(admin.initializeApp).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith("Firebase Admin initialized successfully");
    });

    it("[Edge] should return true and skip initialize if already initialized", () => {
      (admin.apps as any[]).push({ name: "[DEFAULT]" });

      const initialized = initializeFirebaseAdmin();

      expect(initialized).toBe(true);
      expect(admin.initializeApp).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith("Firebase Admin already initialized");
    });
  });

  /* =========================================================================
   * SEND NOTIFICATION TESTS
   * ========================================================================= */
  describe("sendNotifications", () => {
    it("[Positive] should send notifications and return correct counts", async () => {
      const mockResult = {
        successCount: 2,
        failureCount: 0,
        responses: [{ success: true }, { success: true }],
      };
      (admin.messaging().sendEach as jest.Mock).mockResolvedValue(mockResult);

      const messages = [{ token: "token1" }, { token: "token2" }];
      const result = await sendNotifications(messages);

      expect(admin.messaging().sendEach).toHaveBeenCalledWith(messages);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
    });

    it("[Negative] should return early if message array is empty", async () => {
      const result = await sendNotifications([]);

      expect(result).toEqual({ successCount: 0, failureCount: 0 });
      expect(admin.messaging().sendEach).not.toHaveBeenCalled();
    });

    it("[Edge] should return failure count if admin messaging throws error", async () => {
      (admin.messaging().sendEach as jest.Mock).mockRejectedValue(new Error("Network failed"));

      const messages = [{ token: "token1" }];
      const result = await sendNotifications(messages);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  /* =========================================================================
   * MULTICAST NOTIFICATION TESTS
   * ========================================================================= */
  describe("sendMulticast", () => {
    it("[Positive] should successfully execute multicast push", async () => {
      const mockResult = {
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      };
      (admin.messaging().sendEachForMulticast as jest.Mock).mockResolvedValue(mockResult);

      const message = { tokens: ["token1"], notification: { title: "Hello", body: "World" } };
      const result = await sendMulticast(message);

      expect(admin.messaging().sendEachForMulticast).toHaveBeenCalledWith(message);
      expect(result.successCount).toBe(1);
    });

    it("[Negative] should return early if tokens list is empty", async () => {
      const result = await sendMulticast({ tokens: [] });

      expect(result).toEqual({ successCount: 0, failureCount: 0 });
      expect(admin.messaging().sendEachForMulticast).not.toHaveBeenCalled();
    });
  });

  /* =========================================================================
   * SINGLE NOTIFICATION TESTS
   * ========================================================================= */
  describe("sendSingleNotification", () => {
    it("[Positive] should successfully send a single notification", async () => {
      (admin.messaging().send as jest.Mock).mockResolvedValue("msg-123");

      const result = await sendSingleNotification({ token: "token1" });

      expect(result).toEqual({ success: true, messageId: "msg-123" });
    });

    it("[Negative] should handle errors if single send fails", async () => {
      (admin.messaging().send as jest.Mock).mockRejectedValue(new Error("Invalid token"));

      const result = await sendSingleNotification({ token: "invalid-token" });

      expect(result).toEqual({ success: false, error: "Invalid token" });
    });
  });

  /* =========================================================================
   * BUILDERS & UTILITIES TESTS
   * ========================================================================= */
  describe("builders and utilities", () => {
    it("[Positive] should validate device token correctly", () => {
      expect(validateDeviceToken("")).toBe(false);
      expect(validateDeviceToken("short")).toBe(false);
      expect(validateDeviceToken("a".repeat(30))).toBe(true);
    });

    it("[Positive] should build config formats correctly", () => {
      const android = buildAndroidConfig("T", "B");
      expect(android.notification?.title).toBe("T");
      expect(android.priority).toBe("high");

      const apns = buildApnsConfig(5);
      expect(apns.payload?.aps?.badge).toBe(5);

      const web = buildWebpushConfig("T", "B");
      expect(web.notification?.title).toBe("T");
    });

    it("[Positive] should get active app instance and messaging client", () => {
      (admin.apps as any[]).push({ name: "[DEFAULT]" });

      const app = getFirebaseApp();
      expect(app).toBeDefined();

      const messaging = getMessaging();
      expect(messaging).toBeDefined();
    });
  });
});
