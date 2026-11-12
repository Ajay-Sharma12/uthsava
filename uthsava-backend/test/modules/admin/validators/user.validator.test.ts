import {
  listUserQuerySchema,
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
} from "../../../../src/modules/admin/validators/user.validator";

describe("User Validator Unit Tests", () => {
  describe("createUserSchema", () => {
    it("[Positive] should validate valid user creation data", () => {
      const { error, value } = createUserSchema.validate({
        fullName: "John User",
        email: "john.user@example.com",
        countryCode: 91,
        mobile: "9876543210",
        gender: "male",
      });
      expect(error).toBeUndefined();
      expect(value.fullName).toBe("John User");
    });

    it("[Validation] should fail if email is invalid", () => {
      const { error } = createUserSchema.validate({
        fullName: "John User",
        email: "invalid-email",
        countryCode: 91,
        mobile: "9876543210",
        gender: "male",
      });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.email.invalid");
    });

    it("[Validation/Edge] should fail if mobile is less than 7 digits", () => {
      const { error } = createUserSchema.validate({
        fullName: "John User",
        email: "john@example.com",
        countryCode: 91,
        mobile: "12345",
        gender: "male",
      });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.mobileNumberMustBe715Digits");
    });
  });

  describe("updateUserStatusSchema & listUserQuerySchema", () => {
    it("[Positive] should validate user status update", () => {
      const { error } = updateUserStatusSchema.validate({ status: "active" });
      expect(error).toBeUndefined();
    });

    it("[Positive] should validate user list query parameters", () => {
      const { error } = listUserQuerySchema.validate({
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      expect(error).toBeUndefined();
    });
  });
});
