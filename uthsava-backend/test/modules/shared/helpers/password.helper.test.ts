import { PasswordHelper } from "../../../../src/modules/shared/helpers/password.helper";

describe("PasswordHelper Unit Tests", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  describe("generateAlphanumericPassword", () => {
    it("[Positive] should successfully generate password of default length 10", () => {
      const password = PasswordHelper.generateAlphanumericPassword();

      expect(password).toHaveLength(10);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[0-9]/.test(password)).toBe(true);
      expect(/[@#$%&*!]/.test(password)).toBe(true);
    });

    it("[Positive] should successfully generate password of custom length 15", () => {
      const password = PasswordHelper.generateAlphanumericPassword(15);

      expect(password).toHaveLength(15);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[0-9]/.test(password)).toBe(true);
      expect(/[@#$%&*!]/.test(password)).toBe(true);
    });
  });

  describe("generateSecurePassword", () => {
    it("[Positive] should return default fallback password in development/test environments", () => {
      process.env.NODE_ENV = "test";
      const password = PasswordHelper.generateSecurePassword();

      expect(password).toBe("Octal@123");
    });

    it("[Positive] should successfully generate a secure password in production environment", () => {
      process.env.NODE_ENV = "production";
      const password = PasswordHelper.generateSecurePassword();

      expect(password).toHaveLength(12); // UTHSAVA PASSWORD_CONFIG.GENERATED_LENGTH is typically 12
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[0-9]/.test(password)).toBe(true);
      expect(/[!@#$%^&*]/.test(password)).toBe(true);
    });

    it("[Positive] should successfully generate a secure password in uat environment", () => {
      process.env.NODE_ENV = "uat";
      const password = PasswordHelper.generateSecurePassword();

      expect(password).toHaveLength(12);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[0-9]/.test(password)).toBe(true);
      expect(/[!@#$%^&*]/.test(password)).toBe(true);
    });
  });

  /* =========================================================================
   * NEGATIVE / VALIDATION TEST CASES
   * ========================================================================= */
  describe("generateAlphanumericPassword Length Limits", () => {
    it("[Negative] should enforce a minimum length of 8 characters if length < 8 is requested", () => {
      const password = PasswordHelper.generateAlphanumericPassword(5);

      expect(password).toHaveLength(8);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[0-9]/.test(password)).toBe(true);
      expect(/[@#$%&*!]/.test(password)).toBe(true);
    });
  });
});
