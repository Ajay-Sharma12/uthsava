/// <reference types="jest" />
import { PaymentTransaction, PaymentStatus } from "../../src/models/payment.model";
import mongoose from "mongoose";

describe("PaymentTransaction Model Schema Validation", () => {
  const validUserId = new mongoose.Types.ObjectId();
  const validSubscriptionId = new mongoose.Types.ObjectId();

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with all required fields", () => {
    const payment = new PaymentTransaction({
      userId: validUserId,
      subscriptionId: validSubscriptionId,
      amount: 199,
      finalAmount: 199,
    });

    const error = payment.validateSync();
    expect(error).toBeUndefined();
    expect(payment.status).toBe(PaymentStatus.PENDING);
    expect(payment.discountAmount).toBe(0);
  });

  it("[Positive] should validate with all optional fields", () => {
    const couponId = new mongoose.Types.ObjectId();
    const payment = new PaymentTransaction({
      userId: validUserId,
      subscriptionId: validSubscriptionId,
      couponId,
      amount: 299,
      discountAmount: 50,
      finalAmount: 249,
      gatewayTransactionId: "GW-TXN-001",
      status: PaymentStatus.SUCCESS,
      paidAt: new Date(),
    });

    const error = payment.validateSync();
    expect(error).toBeUndefined();
    expect(payment.status).toBe(PaymentStatus.SUCCESS);
    expect(payment.discountAmount).toBe(50);
  });

  it("[Positive] should default status to PENDING", () => {
    const payment = new PaymentTransaction({
      userId: validUserId,
      subscriptionId: validSubscriptionId,
      amount: 100,
      finalAmount: 100,
    });
    expect(payment.status).toBe(PaymentStatus.PENDING);
  });

  it("[Positive] should default discountAmount to 0", () => {
    const payment = new PaymentTransaction({
      userId: validUserId,
      subscriptionId: validSubscriptionId,
      amount: 100,
      finalAmount: 100,
    });
    expect(payment.discountAmount).toBe(0);
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation when userId is missing", () => {
    const payment = new PaymentTransaction({
      subscriptionId: validSubscriptionId,
      amount: 100,
      finalAmount: 100,
    } as any);

    const error = payment.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["userId"]).toBeDefined();
  });

  it("[Negative] should fail validation when subscriptionId is missing", () => {
    const payment = new PaymentTransaction({
      userId: validUserId,
      amount: 100,
      finalAmount: 100,
    } as any);

    const error = payment.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["subscriptionId"]).toBeDefined();
  });

  it("[Negative] should fail validation when amount is missing", () => {
    const payment = new PaymentTransaction({
      userId: validUserId,
      subscriptionId: validSubscriptionId,
      finalAmount: 100,
    } as any);

    const error = payment.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["amount"]).toBeDefined();
  });

  it("[Negative] should fail validation when finalAmount is missing", () => {
    const payment = new PaymentTransaction({
      userId: validUserId,
      subscriptionId: validSubscriptionId,
      amount: 100,
    } as any);

    const error = payment.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["finalAmount"]).toBeDefined();
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Validation] should fail with invalid status enum value", () => {
    const payment = new PaymentTransaction({
      userId: validUserId,
      subscriptionId: validSubscriptionId,
      amount: 100,
      finalAmount: 100,
      status: "PROCESSING" as any,
    });

    const error = payment.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["status"]).toBeDefined();
  });

  it("[Edge] should allow all valid PaymentStatus values", () => {
    const validStatuses = [
      PaymentStatus.PENDING,
      PaymentStatus.SUCCESS,
      PaymentStatus.FAILED,
      PaymentStatus.REFUNDED,
    ];

    validStatuses.forEach((status) => {
      const payment = new PaymentTransaction({
        userId: validUserId,
        subscriptionId: validSubscriptionId,
        amount: 100,
        finalAmount: 100,
        status,
      });
      const error = payment.validateSync();
      expect(error).toBeUndefined();
    });
  });

  it("[Edge] should accept zero amount", () => {
    const payment = new PaymentTransaction({
      userId: validUserId,
      subscriptionId: validSubscriptionId,
      amount: 0,
      finalAmount: 0,
    });

    const error = payment.validateSync();
    expect(error).toBeUndefined();
  });
});
