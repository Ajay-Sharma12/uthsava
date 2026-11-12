import mongoose from "mongoose";
import { Notification, UserNotificationType } from "../../src/models/user-notification.model";

describe("Notification Model Schema Validation", () => {
  const mockUserId = new mongoose.Types.ObjectId();

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with all correct fields", () => {
    const validNotification = new Notification({
      userId: mockUserId,
      title: "Subscription Purchase Successful",
      message: "Your premium subscription has been successfully activated.",
      type: UserNotificationType.SUBSCRIPTION_PURCHASED,
      isRead: false,
    });

    const validationError = validNotification.validateSync();
    expect(validationError).toBeUndefined();
    expect(validNotification.title).toBe("Subscription Purchase Successful");
    expect(validNotification.isRead).toBe(false);
  });

  it("[Positive] should apply default values correctly", () => {
    const validNotification = new Notification({
      userId: mockUserId,
      title: "Simple Alert",
      message: "This is a simple alert message.",
      type: UserNotificationType.SYSTEM_NOTIFICATION,
    });

    const validationError = validNotification.validateSync();
    expect(validationError).toBeUndefined();
    expect(validNotification.isRead).toBe(false); // default value
    expect(validNotification.readAt).toBeNull(); // default value
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation if required field 'userId' is missing", () => {
    const invalidNotification = new Notification({
      title: "System Alert",
      message: "Missing userId in notification",
      type: UserNotificationType.SYSTEM_NOTIFICATION,
    });

    const validationError = invalidNotification.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["userId"]).toBeDefined();
    expect(validationError?.errors["userId"].message).toContain("Path `userId` is required");
  });

  it("[Negative] should fail validation if required field 'title' is missing", () => {
    const invalidNotification = new Notification({
      userId: mockUserId,
      message: "Missing title in notification",
      type: UserNotificationType.SYSTEM_NOTIFICATION,
    });

    const validationError = invalidNotification.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["title"]).toBeDefined();
    expect(validationError?.errors["title"].message).toContain("Path `title` is required");
  });

  it("[Negative] should fail validation if invalid type enum is provided", () => {
    const invalidNotification = new Notification({
      userId: mockUserId,
      title: "Alert",
      message: "Invalid type alert",
      type: "INVALID_NOTIFICATION_TYPE" as any,
    });

    const validationError = invalidNotification.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["type"]).toBeDefined();
    expect(validationError?.errors["type"].message).toContain("is not a valid enum value");
  });
});
