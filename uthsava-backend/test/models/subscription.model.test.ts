/// <reference types="jest" />
import { SubscriptionPlan, StreamingQuality, PlanStatus } from "../../src/models/subscription.model";

describe("SubscriptionPlan Model Schema Validation", () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with all required fields", () => {
    const plan = new SubscriptionPlan({
      name: "Basic",
      monthlyPrice: 99,
      deviceLimit: 1,
      maxConcurrentStreams: 1,
      streamingQuality: StreamingQuality.SD,
    });

    const error = plan.validateSync();
    expect(error).toBeUndefined();
    expect(plan.status).toBe(PlanStatus.ACTIVE);
    expect(plan.isAdFree).toBe(false);
    expect(plan.isPopular).toBe(false);
    expect(plan.displayOrder).toBe(0);
    expect(plan.trialDays).toBe(0);
    expect(plan.maxDownloads).toBe(0);
  });

  it("[Positive] should validate with all optional fields", () => {
    const plan = new SubscriptionPlan({
      name: "Premium",
      monthlyPrice: 499,
      benefits: ["4K Streaming", "5 devices", "Offline Downloads"],
      deviceLimit: 5,
      maxConcurrentStreams: 4,
      streamingQuality: StreamingQuality.UHD_4K,
      maxDownloads: 25,
      trialDays: 7,
      isAdFree: true,
      isPopular: true,
      displayOrder: 3,
      status: PlanStatus.ACTIVE,
    });

    const error = plan.validateSync();
    expect(error).toBeUndefined();
    expect(plan.isAdFree).toBe(true);
    expect(plan.isPopular).toBe(true);
    expect(plan.trialDays).toBe(7);
  });

  it("[Positive] should default status to ACTIVE", () => {
    const plan = new SubscriptionPlan({
      name: "Standard",
      monthlyPrice: 199,
      deviceLimit: 2,
      maxConcurrentStreams: 2,
      streamingQuality: StreamingQuality.HD,
    });
    expect(plan.status).toBe(PlanStatus.ACTIVE);
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation when name is missing", () => {
    const plan = new SubscriptionPlan({
      monthlyPrice: 199,
      deviceLimit: 2,
      maxConcurrentStreams: 2,
      streamingQuality: StreamingQuality.HD,
    } as any);

    const error = plan.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["name"]).toBeDefined();
  });

  it("[Negative] should fail validation when monthlyPrice is missing", () => {
    const plan = new SubscriptionPlan({
      name: "Standard",
      deviceLimit: 2,
      maxConcurrentStreams: 2,
      streamingQuality: StreamingQuality.HD,
    } as any);

    const error = plan.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["monthlyPrice"]).toBeDefined();
  });

  it("[Negative] should fail validation when deviceLimit is missing", () => {
    const plan = new SubscriptionPlan({
      name: "Standard",
      monthlyPrice: 199,
      maxConcurrentStreams: 2,
      streamingQuality: StreamingQuality.HD,
    } as any);

    const error = plan.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["deviceLimit"]).toBeDefined();
  });

  it("[Negative] should fail validation when streamingQuality is missing", () => {
    const plan = new SubscriptionPlan({
      name: "Standard",
      monthlyPrice: 199,
      deviceLimit: 2,
      maxConcurrentStreams: 2,
    } as any);

    const error = plan.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["streamingQuality"]).toBeDefined();
  });

  it("[Negative] should fail validation when monthlyPrice is below min (0)", () => {
    const plan = new SubscriptionPlan({
      name: "Free",
      monthlyPrice: -1,
      deviceLimit: 1,
      maxConcurrentStreams: 1,
      streamingQuality: StreamingQuality.SD,
    });

    const error = plan.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["monthlyPrice"]).toBeDefined();
  });

  it("[Negative] should fail validation when deviceLimit is below min (1)", () => {
    const plan = new SubscriptionPlan({
      name: "Basic",
      monthlyPrice: 99,
      deviceLimit: 0,
      maxConcurrentStreams: 1,
      streamingQuality: StreamingQuality.SD,
    });

    const error = plan.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["deviceLimit"]).toBeDefined();
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Validation] should fail with invalid streamingQuality enum", () => {
    const plan = new SubscriptionPlan({
      name: "Basic",
      monthlyPrice: 99,
      deviceLimit: 1,
      maxConcurrentStreams: 1,
      streamingQuality: "8K" as any,
    });

    const error = plan.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["streamingQuality"]).toBeDefined();
  });

  it("[Validation] should fail with invalid status enum", () => {
    const plan = new SubscriptionPlan({
      name: "Basic",
      monthlyPrice: 99,
      deviceLimit: 1,
      maxConcurrentStreams: 1,
      streamingQuality: StreamingQuality.SD,
      status: "ARCHIVED" as any,
    });

    const error = plan.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["status"]).toBeDefined();
  });

  it("[Edge] should accept name up to 100 chars", () => {
    const plan = new SubscriptionPlan({
      name: "A".repeat(100),
      monthlyPrice: 99,
      deviceLimit: 1,
      maxConcurrentStreams: 1,
      streamingQuality: StreamingQuality.SD,
    });

    const error = plan.validateSync();
    expect(error).toBeUndefined();
  });

  it("[Edge] should accept monthly price of 0 (free plan)", () => {
    const plan = new SubscriptionPlan({
      name: "Free",
      monthlyPrice: 0,
      deviceLimit: 1,
      maxConcurrentStreams: 1,
      streamingQuality: StreamingQuality.SD,
    });

    const error = plan.validateSync();
    expect(error).toBeUndefined();
  });

  it("[Edge] should validate all valid StreamingQuality values", () => {
    const qualities = [
      StreamingQuality.SD,
      StreamingQuality.HD,
      StreamingQuality.FULL_HD,
      StreamingQuality.UHD_4K,
    ];

    qualities.forEach((quality) => {
      const plan = new SubscriptionPlan({
        name: `Plan-${quality}`,
        monthlyPrice: 99,
        deviceLimit: 1,
        maxConcurrentStreams: 1,
        streamingQuality: quality,
      });
      const error = plan.validateSync();
      expect(error).toBeUndefined();
    });
  });
});
