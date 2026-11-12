import {
  updateSettingsSchema,
  addRevenueBracketSchema,
  updateRevenueBracketSchema,
  bracketIdParamSchema,
} from "../../../../src/modules/admin/validators/settings.validator";

describe("Settings Validator Unit Tests", () => {
  describe("updateSettingsSchema", () => {
    it("[Positive] should validate settings update payload", () => {
      const { error, value } = updateSettingsSchema.validate({
        instagram: "https://instagram.com/uthsava",
        facebook: "https://facebook.com/uthsava",
        email: "support@uthsava.com",
        freePreviewEnabled: true,
        freePreviewDurationMinutes: 10,
        payoutFrequencyDays: 30,
        yearlySubscriptionDiscount: 20,
      });
      expect(error).toBeUndefined();
      expect(value.freePreviewDurationMinutes).toBe(10);
    });

    it("[Validation/Edge] should fail when instagram URL pattern is invalid", () => {
      const { error } = updateSettingsSchema.validate({
        instagram: "invalid-url-format",
      });
      expect(error).toBeDefined();
    });
  });

  describe("addRevenueBracketSchema & bracketIdParamSchema", () => {
    it("[Positive] should validate valid revenue bracket creation", () => {
      const { error } = addRevenueBracketSchema.validate({
        fromViews: 0,
        toViews: 1000,
        amountPerView: 0.5,
      });
      expect(error).toBeUndefined();
    });

    it("[Validation/Edge] should fail if toViews is less than fromViews", () => {
      const { error } = addRevenueBracketSchema.validate({
        fromViews: 1000,
        toViews: 500,
        amountPerView: 0.5,
      });
      expect(error).toBeDefined();
    });

    it("[Positive] should validate valid bracketId param", () => {
      const { error } = bracketIdParamSchema.validate({ bracketId: "507f1f77bcf86cd799439011" });
      expect(error).toBeUndefined();
    });
  });
});
