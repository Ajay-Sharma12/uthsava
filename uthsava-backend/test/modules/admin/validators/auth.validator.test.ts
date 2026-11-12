import {
  adminLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyResetTokenSchema,
  changePasswordSchema,
  updateProfileSchema,
} from "../../../../src/modules/admin/validators/auth.validator";

describe("Admin Auth Validator Unit Tests", () => {
  describe("adminLoginSchema", () => {
    it("should validate valid login data (Positive)", () => {
      const { error, value } = adminLoginSchema.validate({
        email: "admin@example.com",
        password: "password123",
        rememberMe: true,
      });
      expect(error).toBeUndefined();
      expect(value.email).toBe("admin@example.com");
    });

    it("should fail validation if email is missing (Validation)", () => {
      const { error } = adminLoginSchema.validate({ password: "password123" });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.email.required");
    });

    it("should fail validation if password is too short (Validation)", () => {
      const { error } = adminLoginSchema.validate({ email: "admin@example.com", password: "123" });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.passwordMustBeAtLeast6CharactersLong");
    });
  });

  describe("forgotPasswordSchema", () => {
    it("should validate valid forgot password payload (Positive)", () => {
      const { error } = forgotPasswordSchema.validate({ email: "user@example.com" });
      expect(error).toBeUndefined();
    });

    it("should fail for invalid email format (Validation)", () => {
      const { error } = forgotPasswordSchema.validate({ email: "invalid-email" });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.email.invalid");
    });
  });

  describe("resetPasswordSchema", () => {
    it("should validate strong password matching confirmation (Positive)", () => {
      const { error } = resetPasswordSchema.validate({
        token: "token123",
        newPassword: "StrongPassword123!",
        confirmPassword: "StrongPassword123!",
      });
      expect(error).toBeUndefined();
    });

    it("should fail when passwords do not match (Validation)", () => {
      const { error } = resetPasswordSchema.validate({
        token: "token123",
        newPassword: "StrongPassword123!",
        confirmPassword: "DifferentPassword123!",
      });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.passwordsDoNotMatch");
    });

    it("should fail when password lacks special character or uppercase (Validation/Edge)", () => {
      const { error } = resetPasswordSchema.validate({
        token: "token123",
        newPassword: "weakpassword",
        confirmPassword: "weakpassword",
      });
      expect(error).toBeDefined();
    });
  });

  describe("changePasswordSchema", () => {
    it("should validate valid change password input (Positive)", () => {
      const { error } = changePasswordSchema.validate({
        currentPassword: "OldPassword123!",
        newPassword: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      });
      expect(error).toBeUndefined();
    });

    it("should fail if currentPassword is missing (Validation)", () => {
      const { error } = changePasswordSchema.validate({
        newPassword: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.currentPasswordIsRequired");
    });
  });

  describe("updateProfileSchema", () => {
    it("should validate profile update (Positive)", () => {
      const { error } = updateProfileSchema.validate({
        firstName: "John",
        lastName: "Doe",
        profileImage: "https://example.com/avatar.jpg",
      });
      expect(error).toBeUndefined();
    });

    it("should fail if firstName is too short (Validation)", () => {
      const { error } = updateProfileSchema.validate({ firstName: "A" });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.firstName.min");
    });
  });
});
