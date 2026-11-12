/// <reference types="jest" />
import {
  AdminSentNotification,
  NotificationType,
  NotificationChannel,
  NotificationRecipientType,
  NotificationStatus,
} from "../../src/models/admin-sent-notification.model";

describe("AdminSentNotification Model Schema Validation", () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with all required fields", () => {
    const notification = new AdminSentNotification({
      title: "New Movie Released",
      message: "A brand new movie is available now!",
      type: NotificationType.NEW_MOVIE_RELEASED,
      channels: [NotificationChannel.PUSH],
      recipientType: NotificationRecipientType.ALL_USERS,
    });

    const error = notification.validateSync();
    expect(error).toBeUndefined();
    expect(notification.status).toBe(NotificationStatus.SCHEDULED);
    expect(notification.recipientCount).toBe(0);
    expect(notification.successCount).toBe(0);
    expect(notification.failureCount).toBe(0);
  });

  it("[Positive] should validate successfully with multiple channels", () => {
    const notification = new AdminSentNotification({
      title: "Promo",
      message: "Special offer just for you!",
      type: NotificationType.PROMOTIONAL_OFFER,
      channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL, NotificationChannel.SMS],
      recipientType: NotificationRecipientType.FREE_USERS,
    });

    const error = notification.validateSync();
    expect(error).toBeUndefined();
    expect(notification.channels).toHaveLength(3);
  });

  it("[Positive] should validate successfully with SENT status", () => {
    const notification = new AdminSentNotification({
      title: "System Update",
      message: "We have released a new system update.",
      type: NotificationType.SYSTEM_UPDATE,
      channels: [NotificationChannel.PUSH],
      recipientType: NotificationRecipientType.ALL_USERS,
      status: NotificationStatus.SENT,
      sentAt: new Date(),
      recipientCount: 500,
      successCount: 495,
      failureCount: 5,
    });

    const error = notification.validateSync();
    expect(error).toBeUndefined();
    expect(notification.status).toBe(NotificationStatus.SENT);
    expect(notification.recipientCount).toBe(500);
  });

  it("[Positive] should default status to SCHEDULED", () => {
    const notification = new AdminSentNotification({
      title: "Test",
      message: "Test message",
      type: NotificationType.SUBSCRIPTION_RENEWAL,
      channels: [NotificationChannel.EMAIL],
      recipientType: NotificationRecipientType.SUBSCRIBED_USERS,
    });

    expect(notification.status).toBe(NotificationStatus.SCHEDULED);
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation when title is missing", () => {
    const notification = new AdminSentNotification({
      message: "Some message",
      type: NotificationType.NEW_MOVIE_RELEASED,
      channels: [NotificationChannel.PUSH],
      recipientType: NotificationRecipientType.ALL_USERS,
    });

    const error = notification.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["title"]).toBeDefined();
  });

  it("[Negative] should fail validation when message is missing", () => {
    const notification = new AdminSentNotification({
      title: "My Title",
      type: NotificationType.NEW_MOVIE_RELEASED,
      channels: [NotificationChannel.PUSH],
      recipientType: NotificationRecipientType.ALL_USERS,
    });

    const error = notification.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["message"]).toBeDefined();
  });

  it("[Negative] should fail validation when type is missing", () => {
    const notification = new AdminSentNotification({
      title: "My Title",
      message: "My message",
      channels: [NotificationChannel.PUSH],
      recipientType: NotificationRecipientType.ALL_USERS,
    } as any);

    const error = notification.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["type"]).toBeDefined();
  });

  it("[Negative] should fail validation when recipientType is missing", () => {
    const notification = new AdminSentNotification({
      title: "My Title",
      message: "My message",
      type: NotificationType.PROMOTIONAL_OFFER,
      channels: [NotificationChannel.PUSH],
    } as any);

    const error = notification.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["recipientType"]).toBeDefined();
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Validation] should fail validation with invalid type enum value", () => {
    const notification = new AdminSentNotification({
      title: "My Title",
      message: "My message",
      type: "INVALID_TYPE" as any,
      channels: [NotificationChannel.PUSH],
      recipientType: NotificationRecipientType.ALL_USERS,
    });

    const error = notification.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["type"]).toBeDefined();
  });

  it("[Validation] should fail validation with invalid status enum value", () => {
    const notification = new AdminSentNotification({
      title: "My Title",
      message: "My message",
      type: NotificationType.SYSTEM_UPDATE,
      channels: [NotificationChannel.PUSH],
      recipientType: NotificationRecipientType.ALL_USERS,
      status: "PENDING" as any,
    });

    const error = notification.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["status"]).toBeDefined();
  });

  it("[Edge] should accept empty recipientUserIds array by default", () => {
    const notification = new AdminSentNotification({
      title: "My Title",
      message: "My message",
      type: NotificationType.PROMOTIONAL_OFFER,
      channels: [NotificationChannel.PUSH],
      recipientType: NotificationRecipientType.SELECTED_USERS,
    });

    const error = notification.validateSync();
    expect(error).toBeUndefined();
    expect(notification.recipientUserIds).toEqual([]);
  });

  it("[Edge] should validate message maxlength of 5000 characters", () => {
    const longMessage = "a".repeat(5001);
    const notification = new AdminSentNotification({
      title: "My Title",
      message: longMessage,
      type: NotificationType.PROMOTIONAL_OFFER,
      channels: [NotificationChannel.PUSH],
      recipientType: NotificationRecipientType.ALL_USERS,
    });

    const error = notification.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["message"]).toBeDefined();
  });
});
