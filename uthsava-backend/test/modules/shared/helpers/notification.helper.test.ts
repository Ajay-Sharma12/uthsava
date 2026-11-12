/// <reference types="jest" />
import mongoose from "mongoose";
import admin from "firebase-admin";
import {
  createNotification,
  getUnreadNotificationCount,
  sendNotification,
} from "../../../../src/modules/shared/helpers/notification.helper";
import { Notification, User } from "../../../../src/models";
import { logger } from "../../../../src/core/constants/logger";

// Mock firebase-admin
jest.mock("firebase-admin", () => {
  const mockMessagingInstance = {
    send: jest.fn(),
  };
  return {
    apps: [{ name: "mock-app" }],
    initializeApp: jest.fn(),
    credential: {
      cert: jest.fn(),
    },
    messaging: jest.fn().mockReturnValue(mockMessagingInstance),
  };
});

// Mock models
jest.mock("../../../../src/models", () => {
  return {
    Notification: {
      create: jest.fn(),
      countDocuments: jest.fn(),
      findOne: jest.fn(),
    },
    User: {
      updateOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    },
  };
});

// Mock logger
jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("Notification Helper Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Keep apps mocked as initialized
    (admin.apps as any) = [{ name: "mock-app" }];
  });

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should create a notification record successfully in database", async () => {
    const receiverId = new mongoose.Types.ObjectId();
    const senderId = new mongoose.Types.ObjectId();

    await createNotification({
      receiverUserId: receiverId,
      senderId,
      title: "New Alert",
      description: "You have a message",
      type: "alert",
      dataId: "12345",
    });

    expect(Notification.create).toHaveBeenCalledWith({
      userId: receiverId,
      senderId,
      title: "New Alert",
      description: "You have a message",
      type: "alert",
      dataId: "12345",
    });
  });

  it("[Positive] should successfully send push notifications to multiple devices", async () => {
    const userId = new mongoose.Types.ObjectId();
    const devices = [
      { token: "tok-web", type: "web" as const },
      { token: "tok-ios", type: "ios" as const },
    ];
    (admin.messaging().send as jest.Mock).mockResolvedValue("msg123");
    (Notification.countDocuments as jest.Mock).mockResolvedValue(2);

    const result = await sendNotification({
      userId,
      devices,
      title: "Alert",
      description: "Important message",
      saveToDb: true,
    });

    expect(Notification.create).toHaveBeenCalledWith({
      userId,
      senderId: userId,
      title: "Alert",
      description: "Important message",
    });
    expect(admin.messaging().send).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ sent: 2, failed: 0 });
  });

  it("[Positive] should return unread notification count successfully", async () => {
    const userId = new mongoose.Types.ObjectId();
    (Notification.countDocuments as jest.Mock).mockResolvedValue(5);

    const count = await getUnreadNotificationCount(userId);

    expect(count).toBe(5);
    expect(Notification.countDocuments).toHaveBeenCalledWith({
      userId,
      isRead: false,
    });
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should rethrow exception if createNotification model save fails", async () => {
    const dbError = new Error("Database timeout");
    (Notification.create as jest.Mock).mockRejectedValue(dbError);

    await expect(
      createNotification({
        receiverUserId: new mongoose.Types.ObjectId(),
        title: "Test",
        description: "Test description",
      })
    ).rejects.toThrow("Database timeout");

    expect(logger.error).toHaveBeenCalledWith("Failed to create notification", dbError);
  });

  it("[Negative] should return 0 failed and 0 sent when devices list is empty", async () => {
    const result = await sendNotification({
      userId: new mongoose.Types.ObjectId(),
      devices: [],
      title: "Alert",
      description: "Message",
      saveToDb: false,
    });

    expect(result).toEqual({ sent: 0, failed: 0 });
    expect(admin.messaging().send).not.toHaveBeenCalled();
  });

  /* =========================================================================
   * EDGE TEST CASES
   * ========================================================================= */
  it("[Edge] should return all failed if firebase app is not initialized", async () => {
    (admin.apps as any) = []; // Simulate firebase disabled

    const result = await sendNotification({
      userId: new mongoose.Types.ObjectId(),
      devices: [{ token: "tok-web", type: "web" }],
      title: "Alert",
      description: "Message",
      saveToDb: false,
    });

    expect(result).toEqual({ sent: 0, failed: 1 });
  });

  it("[Edge] should catch send error and report failed device count without crashing", async () => {
    const devices = [{ token: "tok-web", type: "web" as const }];
    (admin.messaging().send as jest.Mock).mockRejectedValue(new Error("Firebase network error"));

    const result = await sendNotification({
      userId: new mongoose.Types.ObjectId(),
      devices,
      title: "Alert",
      description: "Message",
      saveToDb: false,
    });

    expect(result).toEqual({ sent: 0, failed: 1 });
    expect(logger.error).toHaveBeenCalled();
  });
});
