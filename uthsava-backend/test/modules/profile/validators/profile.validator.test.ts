/// <reference types="jest" />
import {
  updateProfileSchema,
  updateProfileImageSchema,
  changePasswordSchema,
  updateNotificationSettingsSchema,
} from "../../../../src/modules/profile/validators/profile.validator";

describe("Profile Validator Unit Tests", () => {
  /* =========================================================================
   * updateProfileSchema Tests
   * ========================================================================= */
  describe("updateProfileSchema", () => {
    it("[Positive] should validate successfully with correct fields", () => {
      const data = {
        firstName: "John",
        lastName: "Doe",
        fullName: "John Doe",
        location: "New York",
        mobile: "1234567890",
        countryCode: 1,
      };
      const { error } = updateProfileSchema.validate(data);
      expect(error).toBeUndefined();
    });

    it("[Validation] should fail if no fields are provided", () => {
      const { error } = updateProfileSchema.validate({});
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.atLeastOneFieldMustBeProvidedToUpdate");
    });

    it("[Validation] should fail if firstName is less than 2 characters", () => {
      const { error } = updateProfileSchema.validate({ firstName: "A" });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.firstNameMustBeAtLeast2CharactersLong");
    });

    it("[Validation] should fail if countryCode exceeds 999", () => {
      const { error } = updateProfileSchema.validate({ countryCode: 1000 });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.countryCodeCannotExceed999");
    });
  });

  /* =========================================================================
   * updateProfileImageSchema Tests
   * ========================================================================= */
  describe("updateProfileImageSchema", () => {
    it("[Positive] should validate successfully with a valid image string", () => {
      const { error } = updateProfileImageSchema.validate({ profileImage: "image.png" });
      expect(error).toBeUndefined();
    });

    it("[Validation] should fail if profileImage is missing", () => {
      const { error } = updateProfileImageSchema.validate({});
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.profileImageIsRequired");
    });

    it("[Validation] should fail if profileImage is empty", () => {
      const { error } = updateProfileImageSchema.validate({ profileImage: "" });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.profileImageCannotBeEmpty");
    });
  });

  /* =========================================================================
   * changePasswordSchema Tests
   * ========================================================================= */
  describe("changePasswordSchema", () => {
    it("[Positive] should validate successfully with a strong password and matching confirmation", () => {
      const data = {
        currentPassword: "OldPassword123!",
        newPassword: "StrongPassword123!",
        confirmPassword: "StrongPassword123!",
      };
      const { error } = changePasswordSchema.validate(data);
      expect(error).toBeUndefined();
    });

    it("[Validation] should fail if confirmPassword does not match newPassword", () => {
      const data = {
        currentPassword: "OldPassword123!",
        newPassword: "StrongPassword123!",
        confirmPassword: "DifferentPassword123!",
      };
      const { error } = changePasswordSchema.validate(data);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.passwordsDoNotMatch");
    });

    it("[Validation] should fail if newPassword does not meet complexity requirements", () => {
      const data = {
        currentPassword: "OldPassword123!",
        newPassword: "weakpassword", // missing uppercase, digit, special char
        confirmPassword: "weakpassword",
      };
      const { error } = changePasswordSchema.validate(data);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe(
        "validation.newPasswordMustContainAtLeastOneUppercaseLetterOneLowercaseLetterOneNumberAndOneSpecialCharacter"
      );
    });

    it("[Validation] should fail if newPassword is less than 8 characters", () => {
      const data = {
        currentPassword: "OldPassword123!",
        newPassword: "S1!",
        confirmPassword: "S1!",
      };
      const { error } = changePasswordSchema.validate(data);
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.newPasswordMustBeAtLeast8CharactersLong");
    });
  });

  /* =========================================================================
   * updateNotificationSettingsSchema Tests
   * ========================================================================= */
  describe("updateNotificationSettingsSchema", () => {
    it("[Positive] should validate successfully with a boolean value", () => {
      const { error } = updateNotificationSettingsSchema.validate({ notificationEnabled: true });
      expect(error).toBeUndefined();
    });

    it("[Validation] should fail if notificationEnabled is missing", () => {
      const { error } = updateNotificationSettingsSchema.validate({});
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.notificationSettingIsRequired");
    });

    it("[Validation] should fail if notificationEnabled is not a boolean", () => {
      const { error } = updateNotificationSettingsSchema.validate({ notificationEnabled: "yes" });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.notificationSettingMustBeABooleanValue");
    });
  });
});
