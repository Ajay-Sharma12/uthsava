import {
  markNotificationAsReadSchema,
  notificationIdParamSchema,
  paginationQuerySchema,
} from "../../../../src/modules/notification/validators/notification.validator";

describe("Notification Validator Unit Tests", () => {
  /* =========================================================================
   * markNotificationAsReadSchema Tests
   * ========================================================================= */
  describe("markNotificationAsReadSchema", () => {
    it("[Positive] should validate successfully with correct id", () => {
      const { error } = markNotificationAsReadSchema.validate({
        id: "notification_123",
      });
      expect(error).toBeUndefined();
    });

    it("[Validation] should fail when id is missing", () => {
      const { error } = markNotificationAsReadSchema.validate({});
      expect(error).toBeDefined();
    });
  });

  /* =========================================================================
   * notificationIdParamSchema Tests
   * ========================================================================= */
  describe("notificationIdParamSchema", () => {
    it("[Positive] should validate successfully with correct id", () => {
      const { error } = notificationIdParamSchema.validate({
        id: "notif_456",
      });
      expect(error).toBeUndefined();
    });

    it("[Validation] should fail when id is missing", () => {
      const { error } = notificationIdParamSchema.validate({});
      expect(error).toBeDefined();
    });
  });

  /* =========================================================================
   * paginationQuerySchema Tests
   * ========================================================================= */
  describe("paginationQuerySchema", () => {
    it("[Positive] should validate successfully with valid page and limit values", () => {
      const { error, value } = paginationQuerySchema.validate({
        page: 2,
        limit: 25,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      expect(error).toBeUndefined();
      expect(value.page).toBe(2);
      expect(value.limit).toBe(25);
    });

    it("[Positive] should validate successfully with empty payload", () => {
      const { error } = paginationQuerySchema.validate({});
      expect(error).toBeUndefined();
    });

    it("[Validation/Edge] should fail if page is less than 1", () => {
      const { error } = paginationQuerySchema.validate({
        page: 0,
      });
      expect(error).toBeDefined();
    });

    it("[Validation/Edge] should fail if limit is less than 1", () => {
      const { error } = paginationQuerySchema.validate({
        limit: 0,
      });
      expect(error).toBeDefined();
    });

    it("[Validation/Edge] should fail if limit is greater than 100", () => {
      const { error } = paginationQuerySchema.validate({
        limit: 101,
      });
      expect(error).toBeDefined();
    });

    it("[Validation] should fail if sortOrder is not 'asc' or 'desc'", () => {
      const { error } = paginationQuerySchema.validate({
        sortOrder: "ascending",
      });
      expect(error).toBeDefined();
    });
  });
});
