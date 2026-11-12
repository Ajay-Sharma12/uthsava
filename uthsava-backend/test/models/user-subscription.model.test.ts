/// <reference types="jest" />
import { UserSubscription, SubscriptionStatus } from "../../src/models/user-subscription.model";
import mongoose from "mongoose";

describe("UserSubscription Model Schema Validation", () => {
  const validUserId = new mongoose.Types.ObjectId();
  const validPlanId = new mongoose.Types.ObjectId();
  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with all required fields", () => {
    const subscription = new UserSubscription({
      userId: validUserId,
      planId: validPlanId,
      startDate: now,
      endDate: nextMonth,
    });

    const error = subscription.validateSync();
    expect(error).toBeUndefined();
    expect(subscription.status).toBe(SubscriptionStatus.ACTIVE);
    expect(subscription.autoRenewal).toBe(true);
    expect(subscription.remindersSent).toEqual([]);
  });

  it("[Positive] should validate with all optional fields", () => {
    const couponId = new mongoose.Types.ObjectId();
    const subscription = new UserSubscription({
      userId: validUserId,
      planId: validPlanId,
      couponId,
      autoRenewal: false,
      startDate: now,
      endDate: nextMonth,
      status: SubscriptionStatus.CANCELLED,
      remindersSent: ["7_DAYS", "3_DAYS"],
    });

    const error = subscription.validateSync();
    expect(error).toBeUndefined();
    expect(subscription.status).toBe(SubscriptionStatus.CANCELLED);
    expect(subscription.autoRenewal).toBe(false);
    expect(subscription.remindersSent).toHaveLength(2);
  });

  it("[Positive] should default status to ACTIVE", () => {
    const subscription = new UserSubscription({
      userId: validUserId,
      planId: validPlanId,
      startDate: now,
      endDate: nextMonth,
    });
    expect(subscription.status).toBe(SubscriptionStatus.ACTIVE);
  });

  it("[Positive] should default autoRenewal to true", () => {
    const subscription = new UserSubscription({
      userId: validUserId,
      planId: validPlanId,
      startDate: now,
      endDate: nextMonth,
    });
    expect(subscription.autoRenewal).toBe(true);
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation when userId is missing", () => {
    const subscription = new UserSubscription({
      planId: validPlanId,
      startDate: now,
      endDate: nextMonth,
    } as any);

    const error = subscription.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["userId"]).toBeDefined();
  });

  it("[Negative] should fail validation when planId is missing", () => {
    const subscription = new UserSubscription({
      userId: validUserId,
      startDate: now,
      endDate: nextMonth,
    } as any);

    const error = subscription.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["planId"]).toBeDefined();
  });

  it("[Negative] should fail validation when startDate is missing", () => {
    const subscription = new UserSubscription({
      userId: validUserId,
      planId: validPlanId,
      endDate: nextMonth,
    } as any);

    const error = subscription.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["startDate"]).toBeDefined();
  });

  it("[Negative] should fail validation when endDate is missing", () => {
    const subscription = new UserSubscription({
      userId: validUserId,
      planId: validPlanId,
      startDate: now,
    } as any);

    const error = subscription.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["endDate"]).toBeDefined();
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Validation] should fail with invalid status enum", () => {
    const subscription = new UserSubscription({
      userId: validUserId,
      planId: validPlanId,
      startDate: now,
      endDate: nextMonth,
      status: "PAUSED" as any,
    });

    const error = subscription.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["status"]).toBeDefined();
  });

  it("[Edge] should validate all valid SubscriptionStatus values", () => {
    const statuses = [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.EXPIRED,
      SubscriptionStatus.CANCELLED,
    ];

    statuses.forEach((status) => {
      const subscription = new UserSubscription({
        userId: validUserId,
        planId: validPlanId,
        startDate: now,
        endDate: nextMonth,
        status,
      });
      const error = subscription.validateSync();
      expect(error).toBeUndefined();
    });
  });

  it("[Edge] should accept empty remindersSent array", () => {
    const subscription = new UserSubscription({
      userId: validUserId,
      planId: validPlanId,
      startDate: now,
      endDate: nextMonth,
      remindersSent: [],
    });

    const error = subscription.validateSync();
    expect(error).toBeUndefined();
    expect(subscription.remindersSent).toEqual([]);
  });
});
