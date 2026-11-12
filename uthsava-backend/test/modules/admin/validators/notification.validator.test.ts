import {
  sendNotificationSchema,
  listNotificationsQuerySchema,
} from "../../../../src/modules/admin/validators/notification.validator";

describe("Notification Validator Unit Tests", () => {
  describe("sendNotificationSchema", () => {
    it("[Positive] should validate valid notification payload for ALL_USERS", () => {
      const { error, value } = sendNotificationSchema.validate({
        title: "New Movie Release",
        message: "Check out the latest movie added to platform!",
        category: "NEW_MOVIE_RELEASED",
        notificationTypes: ["PUSH", "EMAIL"],
        sendTo: "ALL_USERS",
      });
      expect(error).toBeUndefined();
      expect(value.title).toBe("New Movie Release");
    });

    it("[Positive] should validate SELECTED_USERS notification with valid recipient ObjectIds", () => {
      const { error } = sendNotificationSchema.validate({
        title: "Account Notice",
        message: "Important notice regarding your subscription.",
        category: "SUBSCRIPTION_RENEWAL",
        notificationTypes: ["EMAIL"],
        sendTo: "SELECTED_USERS",
        recipients: ["507f1f77bcf86cd799439011"],
      });
      expect(error).toBeUndefined();
    });

    it("[Validation/Edge] should fail when SELECTED_USERS is specified but recipients array is empty", () => {
      const { error } = sendNotificationSchema.validate({
        title: "Notice",
        message: "Test message body",
        category: "OFFER_PROMO",
        notificationTypes: ["SMS"],
        sendTo: "SELECTED_USERS",
        recipients: [],
      });
      expect(error).toBeDefined();
    });

    it("[Validation] should fail when notificationTypes array is empty", () => {
      const { error } = sendNotificationSchema.validate({
        title: "Notice",
        message: "Test message body",
        category: "OFFER_PROMO",
        notificationTypes: [],
        sendTo: "ALL_USERS",
      });
      expect(error).toBeDefined();
    });
  });

  describe("listNotificationsQuerySchema", () => {
    it("[Positive] should validate query filter parameters", () => {
      const { error } = listNotificationsQuerySchema.validate({
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      expect(error).toBeUndefined();
    });
  });
});
