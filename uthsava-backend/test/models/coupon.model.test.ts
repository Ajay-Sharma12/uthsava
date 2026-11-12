/// <reference types="jest" />
import mongoose from "mongoose";
import { Coupon, DiscountType, ApplicableUsers, CouponStatus } from "../../src/models/coupon.model";

describe("Coupon Model Schema Validation", () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with all required fields and defaults", () => {
    const coupon = new Coupon({
      code: "SAVE50",
      discountType: DiscountType.PERCENTAGE,
      discountValue: 50,
      usageLimit: 100,
      expiryAt: new Date(Date.now() + 86400000),
      startDate: new Date(),
      applicableUserType: ApplicableUsers.ALL,
      createdBy: new mongoose.Types.ObjectId(),
    });

    const validationError = coupon.validateSync();
    expect(validationError).toBeUndefined();
    expect(coupon.usedCount).toBe(0);
    expect(coupon.status).toBe(CouponStatus.ACTIVE);
  });

  it("[Positive] should validate successfully with SELECTED_USERS and custom user IDs", () => {
    const coupon = new Coupon({
      code: "VIPOFFER",
      discountType: DiscountType.FIXED,
      discountValue: 200,
      usageLimit: 10,
      expiryAt: new Date(Date.now() + 86400000),
      startDate: new Date(),
      applicableUserType: ApplicableUsers.SELECTED,
      applicableUserIds: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
      createdBy: new mongoose.Types.ObjectId(),
      status: CouponStatus.INACTIVE,
    });

    const validationError = coupon.validateSync();
    expect(validationError).toBeUndefined();
    expect(coupon.status).toBe(CouponStatus.INACTIVE);
    expect(coupon.applicableUserIds).toHaveLength(2);
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation if required fields are missing", () => {
    const coupon = new Coupon({});

    const validationError = coupon.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["code"]).toBeDefined();
    expect(validationError?.errors["discountType"]).toBeDefined();
    expect(validationError?.errors["discountValue"]).toBeDefined();
    expect(validationError?.errors["usageLimit"]).toBeDefined();
    expect(validationError?.errors["expiryAt"]).toBeDefined();
    expect(validationError?.errors["startDate"]).toBeDefined();
    expect(validationError?.errors["applicableUserType"]).toBeDefined();
    expect(validationError?.errors["createdBy"]).toBeDefined();
  });

  it("[Negative] should fail validation if coupon code is too short (min 4 chars)", () => {
    const coupon = new Coupon({
      code: "OFF",
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,
      usageLimit: 100,
      expiryAt: new Date(),
      startDate: new Date(),
      applicableUserType: ApplicableUsers.ALL,
      createdBy: new mongoose.Types.ObjectId(),
    });

    const validationError = coupon.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["code"]).toBeDefined();
  });

  it("[Negative] should fail validation if discountValue is less than 1", () => {
    const coupon = new Coupon({
      code: "FREEBIE",
      discountType: DiscountType.PERCENTAGE,
      discountValue: 0, // min: 1
      usageLimit: 100,
      expiryAt: new Date(),
      startDate: new Date(),
      applicableUserType: ApplicableUsers.ALL,
      createdBy: new mongoose.Types.ObjectId(),
    });

    const validationError = coupon.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["discountValue"]).toBeDefined();
  });

  it("[Negative] should fail validation if usageLimit is less than 1", () => {
    const coupon = new Coupon({
      code: "LIMITZERO",
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,
      usageLimit: 0, // min: 1
      expiryAt: new Date(),
      startDate: new Date(),
      applicableUserType: ApplicableUsers.ALL,
      createdBy: new mongoose.Types.ObjectId(),
    });

    const validationError = coupon.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["usageLimit"]).toBeDefined();
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Validation] should fail validation if discountType is set to an invalid enum value", () => {
    const coupon = new Coupon({
      code: "INVALIDTYPE",
      discountType: "CASH_BACK" as any,
      discountValue: 10,
      usageLimit: 100,
      expiryAt: new Date(),
      startDate: new Date(),
      applicableUserType: ApplicableUsers.ALL,
      createdBy: new mongoose.Types.ObjectId(),
    });

    const validationError = coupon.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["discountType"]).toBeDefined();
    expect(validationError?.errors["discountType"].message).toContain("is not a valid enum value");
  });
});
