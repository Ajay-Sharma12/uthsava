/// <reference types="jest" />
import mongoose from "mongoose";
import { OTP, OTPType } from "../../src/models/otp.model";

describe("OTP Model Schema Validation", () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with minimal required fields", () => {
    const otp = new OTP({
      otp: "123456",
      type: OTPType.SIGNUP,
      expiresAt: new Date(Date.now() + 600000),
    });

    const validationError = otp.validateSync();
    expect(validationError).toBeUndefined();
    expect(otp.isUsed).toBe(false);
    expect(otp.attempts).toBe(0);
    expect(otp.sendAttempts).toBe(1);
  });

  it("[Positive] should validate successfully for MOBILE_LOGIN with mobile and countryCode", () => {
    const otp = new OTP({
      otp: "9876",
      type: OTPType.MOBILE_LOGIN,
      mobile: "9876543210",
      countryCode: "+91",
      expiresAt: new Date(Date.now() + 600000),
      userId: new mongoose.Types.ObjectId(),
    });

    const validationError = otp.validateSync();
    expect(validationError).toBeUndefined();
    expect(otp.mobile).toBe("9876543210");
    expect(otp.countryCode).toBe("+91");
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation if required fields (otp, type, expiresAt) are missing", () => {
    const otp = new OTP({});

    const validationError = otp.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["otp"]).toBeDefined();
    expect(validationError?.errors["type"]).toBeDefined();
    expect(validationError?.errors["expiresAt"]).toBeDefined();
  });

  it("[Negative] should fail validation for MOBILE_LOGIN if mobile is missing", () => {
    const otp = new OTP({
      otp: "1234",
      type: OTPType.MOBILE_LOGIN,
      countryCode: "+91",
      expiresAt: new Date(Date.now() + 600000),
    });

    const validationError = otp.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["mobile"]).toBeDefined();
  });

  it("[Negative] should fail validation for MOBILE_LOGIN if countryCode is missing", () => {
    const otp = new OTP({
      otp: "1234",
      type: OTPType.MOBILE_LOGIN,
      mobile: "9876543210",
      expiresAt: new Date(Date.now() + 600000),
    });

    const validationError = otp.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["countryCode"]).toBeDefined();
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Validation] should fail validation if type is set to an invalid enum value", () => {
    const otp = new OTP({
      otp: "1234",
      type: "invalid_type" as any,
      expiresAt: new Date(Date.now() + 600000),
    });

    const validationError = otp.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["type"]).toBeDefined();
    expect(validationError?.errors["type"].message).toContain("is not a valid enum value");
  });
});
