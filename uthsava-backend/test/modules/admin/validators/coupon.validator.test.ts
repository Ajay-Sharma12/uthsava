import {
  couponIdParamSchema,
  createCouponSchema,
  updateCouponSchema,
  couponStatusSchema,
  assignCouponUsersSchema,
} from "../../../../src/modules/admin/validators/coupon.validator";

describe("Coupon Validator Unit Tests", () => {
  describe("couponIdParamSchema", () => {
    it("should validate valid ObjectId (Positive)", () => {
      const { error } = couponIdParamSchema.validate({ couponId: "507f1f77bcf86cd799439011" });
      expect(error).toBeUndefined();
    });

    it("should fail for invalid ObjectId format (Validation/Edge)", () => {
      const { error } = couponIdParamSchema.validate({ couponId: "invalid-id" });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.invalidCouponIdFormat");
    });
  });

  describe("createCouponSchema", () => {
    it("should validate a valid percentage coupon (Positive)", () => {
      const tomorrow = new Date(Date.now() + 86400000);
      const dayAfter = new Date(Date.now() + 172800000);
      const { error, value } = createCouponSchema.validate({
        code: "SAVE20",
        discountType: "PERCENTAGE",
        discountValue: 20,
        usageLimit: 100,
        perUserLimit: 1,
        startDate: tomorrow,
        expiryDate: dayAfter,
        applicableUsers: "ALL_USERS",
      });
      expect(error).toBeUndefined();
      expect(value.code).toBe("SAVE20");
    });

    it("should fail if percentage discount exceeds 90 (Validation/Edge)", () => {
      const tomorrow = new Date(Date.now() + 86400000);
      const dayAfter = new Date(Date.now() + 172800000);
      const { error } = createCouponSchema.validate({
        code: "SAVE95",
        discountType: "PERCENTAGE",
        discountValue: 95,
        usageLimit: 100,
        perUserLimit: 1,
        startDate: tomorrow,
        expiryDate: dayAfter,
        applicableUsers: "ALL_USERS",
      });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.percentageDiscountCannotExceed90");
    });

    it("should fail if expiryDate is before startDate (Validation/Edge)", () => {
      const tomorrow = new Date(Date.now() + 86400000);
      const yesterday = new Date(Date.now() - 86400000);
      const { error } = createCouponSchema.validate({
        code: "SAVE20",
        discountType: "FIXED",
        discountValue: 20,
        usageLimit: 10,
        perUserLimit: 1,
        startDate: tomorrow,
        expiryDate: yesterday,
        applicableUsers: "ALL_USERS",
      });
      expect(error).toBeDefined();
    });
  });

  describe("couponStatusSchema & assignCouponUsersSchema", () => {
    it("should validate status update (Positive)", () => {
      const { error } = couponStatusSchema.validate({ status: "ACTIVE" });
      expect(error).toBeUndefined();
    });

    it("should validate assign users array (Positive)", () => {
      const { error } = assignCouponUsersSchema.validate({ userIds: ["507f1f77bcf86cd799439011"] });
      expect(error).toBeUndefined();
    });

    it("should fail assign users if userIds array is empty (Validation)", () => {
      const { error } = assignCouponUsersSchema.validate({ userIds: [] });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.atLeastOneUserIdMustBeProvided");
    });
  });
});
