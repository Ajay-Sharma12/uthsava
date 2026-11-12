/// <reference types="jest" />
import { generateOtp, isInvalidOtp, isOtpExpired } from "../../../../src/modules/shared/helpers/otp.helper";

describe("OTP Helper Unit Tests", () => {
  /* =========================================================================
   * generateOtp Method Tests
   * ========================================================================= */
  describe("generateOtp", () => {
    it("[Positive] should generate an OTP string of the requested length", () => {
      const otp = generateOtp(4);
      expect(typeof otp).toBe("string");
      expect(otp.length).toBe(4);
      expect(/^\d+$/.test(otp)).toBe(true); // check it only contains digits
    });

    it("[Positive] should default to length 6 if invalid or non-finite length is provided", () => {
      const otpWithNegative = generateOtp(-1);
      expect(otpWithNegative.length).toBe(6);

      const otpWithInfinity = generateOtp(Infinity);
      expect(otpWithInfinity.length).toBe(6);
    });
  });

  /* =========================================================================
   * isInvalidOtp Method Tests
   * ========================================================================= */
  describe("isInvalidOtp", () => {
    it("[Positive] should return true if otpRecord is undefined", () => {
      expect(isInvalidOtp(undefined, "1234")).toBe(true);
    });

    it("[Positive] should return true if providedOtp does not match otpRecord.otp", () => {
      const otpRecord = { otp: "1234" };
      expect(isInvalidOtp(otpRecord, "5678")).toBe(true);
    });

    it("[Positive] should return false if providedOtp matches otpRecord.otp", () => {
      const otpRecord = { otp: "1234" };
      expect(isInvalidOtp(otpRecord, "1234")).toBe(false);
    });
  });

  /* =========================================================================
   * isOtpExpired Method Tests
   * ========================================================================= */
  describe("isOtpExpired", () => {
    it("[Positive] should return true if expiresAt is in the past", () => {
      const pastDate = new Date(Date.now() - 5000); // 5 seconds ago
      expect(isOtpExpired(pastDate)).toBe(true);
    });

    it("[Positive] should return false if expiresAt is in the future", () => {
      const futureDate = new Date(Date.now() + 5000); // 5 seconds from now
      expect(isOtpExpired(futureDate)).toBe(false);
    });
  });
});
