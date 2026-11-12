import {
  userLoginSchema,
  userRegisterSchema,
  forgotPasswordOTPSchema,
  verifyOTPSchema,
  resetPasswordSchema,
  mobileLoginSchema,
  verifyMobileOtpSchema,
  resendMobileOtpSchema,
  completeProfileSchema,
  selectGenreSchema,
} from "../../../../src/modules/auth/validators/auth.validator";

describe("User Auth Validator Unit Tests", () => {
  /* =========================================================================
   * userLoginSchema Tests
   * ========================================================================= */
  describe("userLoginSchema", () => {
    it("[Positive] should validate successfully with all valid fields", () => {
      const { error, value } = userLoginSchema.validate({
        email: "test@example.com",
        password: "password123",
        type: "user",
        rememberMe: true,
        deviceId: "dev123",
      });
      expect(error).toBeUndefined();
      expect(value.email).toBe("test@example.com");
      expect(value.type).toBe("user");
    });

    it("[Validation] should fail when email is missing", () => {
      const { error } = userLoginSchema.validate({
        password: "password123",
        type: "user",
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain("validation.email.required");
    });

    it("[Edge] should fail when password is shorter than 6 characters", () => {
      const { error } = userLoginSchema.validate({
        email: "test@example.com",
        password: "123",
        type: "user",
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain("validation.passwordMustBeAtLeast6CharactersLong");
    });
  });

  /* =========================================================================
   * userRegisterSchema Tests
   * ========================================================================= */
  describe("userRegisterSchema", () => {
    it("[Positive] should validate successfully with correct fields", () => {
      const { error } = userRegisterSchema.validate({
        email: "test@example.com",
        password: "password123",
        role: "user",
      });
      expect(error).toBeUndefined();
    });

    it("[Validation] should fail with invalid email format", () => {
      const { error } = userRegisterSchema.validate({
        email: "invalid-email",
        password: "password123",
      });
      expect(error).toBeDefined();
    });
  });

  /* =========================================================================
   * forgotPasswordOTPSchema Tests
   * ========================================================================= */
  describe("forgotPasswordOTPSchema", () => {
    it("[Positive] should validate successfully with a valid email", () => {
      const { error } = forgotPasswordOTPSchema.validate({
        email: "test@example.com",
      });
      expect(error).toBeUndefined();
    });

    it("[Validation] should fail with invalid email", () => {
      const { error } = forgotPasswordOTPSchema.validate({
        email: "not-an-email",
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain("validation.email.invalid");
    });
  });

  /* =========================================================================
   * verifyOTPSchema Tests
   * ========================================================================= */
  describe("verifyOTPSchema", () => {
    it("[Positive] should validate successfully with correct OTP", () => {
      const { error } = verifyOTPSchema.validate({
        email: "test@example.com",
        otp: "123456",
        otpId: "otp_id_123",
      });
      expect(error).toBeUndefined();
    });

    it("[Validation/Edge] should fail if OTP length is not 6", () => {
      const { error } = verifyOTPSchema.validate({
        email: "test@example.com",
        otp: "12345",
        otpId: "otp_id_123",
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain("validation.otpMustBe6CharactersLong");
    });

    it("[Validation] should fail if OTP contains non-digits", () => {
      const { error } = verifyOTPSchema.validate({
        email: "test@example.com",
        otp: "12345a",
        otpId: "otp_id_123",
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain("validation.otpMustContainOnlyDigits");
    });
  });

  /* =========================================================================
   * resetPasswordSchema Tests
   * ========================================================================= */
  describe("resetPasswordSchema", () => {
    it("[Positive] should validate successfully with a strong password", () => {
      const { error } = resetPasswordSchema.validate({
        email: "test@example.com",
        password: "Password123!",
        otpId: "otp_id_123",
      });
      expect(error).toBeUndefined();
    });

    it("[Validation/Edge] should fail if password has less than 8 characters", () => {
      const { error } = resetPasswordSchema.validate({
        email: "test@example.com",
        password: "Pass1!",
        otpId: "otp_id_123",
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain("validation.passwordMustBeAtLeast8CharactersLong");
    });

    it("[Validation] should fail if password lacks uppercase, lowercase, digit or special char", () => {
      const { error } = resetPasswordSchema.validate({
        email: "test@example.com",
        password: "password123",
        otpId: "otp_id_123",
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain("validation.passwordMustContainAtLeastOneUppercaseLetterOneLowercaseLetterOneDigitAndOneSpecialCharacter");
    });
  });

  /* =========================================================================
   * mobileLoginSchema Tests
   * ========================================================================= */
  describe("mobileLoginSchema", () => {
    it("[Positive] should validate successfully with valid mobile and countryCode starting with +", () => {
      const { error, value } = mobileLoginSchema.validate({
        mobile: "9876543210",
        countryCode: "+91",
      });
      expect(error).toBeUndefined();
      expect(value.countryCode).toBe("+91");
    });

    it("[Positive] should validate successfully with custom valid country code", () => {
      const { error, value } = mobileLoginSchema.validate({
        mobile: "9876543210",
        countryCode: "+1",
      });
      expect(error).toBeUndefined();
      expect(value.countryCode).toBe("+1");
    });

    it("[Validation] should fail if country code is missing", () => {
      const { error } = mobileLoginSchema.validate({
        mobile: "9876543210",
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain("validation.countryCodeIsRequired");
    });

    it("[Validation/Edge] should fail if country code does not start with +", () => {
      const { error } = mobileLoginSchema.validate({
        mobile: "9876543210",
        countryCode: "91",
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain("validation.countryCodeInvalidFormat");
    });

    it("[Validation/Edge] should fail if country code format is invalid", () => {
      const { error } = mobileLoginSchema.validate({
        mobile: "9876543210",
        countryCode: "invalid_cc",
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain("validation.countryCodeInvalidFormat");
    });

    it("[Validation/Edge] should fail if mobile number is not 10 digits", () => {
      const { error } = mobileLoginSchema.validate({
        mobile: "987654321",
        countryCode: "+91",
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain("validation.mobileNumberMustBeExactly10Digits");
    });

    it("[Validation/Edge] should fail if mobile number consists of all identical digits (e.g. 8888888888)", () => {
      const { error } = mobileLoginSchema.validate({
        mobile: "8888888888",
        countryCode: "+91",
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain("validation.mobileNumberCannotBeAllSameDigits");
    });

    it("[Validation/Edge] should fail if mobile number consists of all zeros (e.g. 0000000000)", () => {
      const { error } = mobileLoginSchema.validate({
        mobile: "0000000000",
        countryCode: "+91",
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain("validation.mobileNumberCannotBeAllSameDigits");
    });
  });

  /* =========================================================================
   * verifyMobileOtpSchema Tests
   * ========================================================================= */
  describe("verifyMobileOtpSchema", () => {
    it("[Positive] should validate with correct 4-digit mobile OTP", () => {
      const { error } = verifyMobileOtpSchema.validate({
        mobile: "9876543210",
        countryCode: "+91",
        otp: "1234",
      });
      expect(error).toBeUndefined();
    });

    it("[Validation/Edge] should fail if mobile OTP is not 4 digits", () => {
      const { error } = verifyMobileOtpSchema.validate({
        mobile: "9876543210",
        countryCode: "+91",
        otp: "123",
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain("validation.otpMustBe4CharactersLong");
    });
  });

  /* =========================================================================
   * resendMobileOtpSchema Tests
   * ========================================================================= */
  describe("resendMobileOtpSchema", () => {
    it("[Positive] should validate resend schema with defaults", () => {
      const { error, value } = resendMobileOtpSchema.validate({
        mobile: "9876543210",
        countryCode: "+91",
      });
      expect(error).toBeUndefined();
      expect(value.mobile).toBe("9876543210");
    });
  });

  /* =========================================================================
   * completeProfileSchema Tests
   * ========================================================================= */
  describe("completeProfileSchema", () => {
    it("[Positive] should validate successfully with all profile fields", () => {
      const { error } = completeProfileSchema.validate({
        mobile: "9876543210",
        countryCode: "+91",
        fullName: "John Doe",
        email: "john.doe@test.com",
        age: 25,
        gender: "male",
        acceptedTerms: true,
      });
      expect(error).toBeUndefined();
    });

    it("[Validation/Edge] should fail if name has special characters or digits", () => {
      const { error } = completeProfileSchema.validate({
        mobile: "9876543210",
        countryCode: "+91",
        fullName: "John123",
        email: "john.doe@test.com",
        age: 25,
        gender: "male",
        acceptedTerms: true,
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain("validation.fullNameCanOnlyContainAlphabetsAndSpaces");
    });

    it("[Validation/Edge] should fail if age is under 13", () => {
      const { error } = completeProfileSchema.validate({
        mobile: "9876543210",
        countryCode: "+91",
        fullName: "John Doe",
        email: "john.doe@test.com",
        age: 12,
        gender: "male",
        acceptedTerms: true,
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain("validation.ageMustBeAtLeast13");
    });

    it("[Validation] should fail if terms and conditions are not accepted", () => {
      const { error } = completeProfileSchema.validate({
        mobile: "9876543210",
        countryCode: "+91",
        fullName: "John Doe",
        email: "john.doe@test.com",
        age: 25,
        gender: "male",
        acceptedTerms: false,
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain("validation.youMustAcceptTheTermsAndConditions");
    });
  });

  /* =========================================================================
   * selectGenreSchema Tests
   * ========================================================================= */
  describe("selectGenreSchema", () => {
    it("[Positive] should validate successfully with correct array of ObjectIds", () => {
      const { error } = selectGenreSchema.validate({
        genres: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
      });
      expect(error).toBeUndefined();
    });

    it("[Validation] should fail if array contains invalid hex pattern", () => {
      const { error } = selectGenreSchema.validate({
        genres: ["507f1f77bcf86cd799439011", "invalidId"],
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain("validation.invalidGenreIdFormat");
    });

    it("[Validation/Edge] should fail if selecting more than 5 genres", () => {
      const { error } = selectGenreSchema.validate({
        genres: [
          "507f1f77bcf86cd799439011",
          "507f1f77bcf86cd799439012",
          "507f1f77bcf86cd799439013",
          "507f1f77bcf86cd799439014",
          "507f1f77bcf86cd799439015",
          "507f1f77bcf86cd799439016",
        ],
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain("validation.youCanSelectAMaximumOf5Genres");
    });
  });
});
