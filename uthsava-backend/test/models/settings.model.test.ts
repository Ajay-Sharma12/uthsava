import { PlatformSettings } from "../../src/models/settings.model";

describe("PlatformSettings Model Schema Validation", () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with all default values", () => {
    const settings = new PlatformSettings({
      yearlySubscriptionDiscount: 10,
    });

    const validationError = settings.validateSync();
    expect(validationError).toBeUndefined();
    expect(settings.freePreviewEnabled).toBe(false);
    expect(settings.freePreviewDuration).toBe(0);
    expect(settings.payoutFrequencyDays).toBe(90);
    expect(settings.yearlySubscriptionDiscount).toBe(10);
    expect(settings.revenueBrackets).toHaveLength(0);
  });

  it("[Positive] should validate successfully with valid nested revenue brackets", () => {
    const settings = new PlatformSettings({
      yearlySubscriptionDiscount: 20,
      revenueBrackets: [
        {
          fromViews: 100,
          toViews: 500,
          amountPerView: 0.05,
        },
      ],
    });

    const validationError = settings.validateSync();
    expect(validationError).toBeUndefined();
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation if payoutFrequencyDays is less than 1", () => {
    const settings = new PlatformSettings({
      yearlySubscriptionDiscount: 15,
      payoutFrequencyDays: 0, // min: 1
    });

    const validationError = settings.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["payoutFrequencyDays"]).toBeDefined();
  });

  it("[Negative] should fail validation if yearlySubscriptionDiscount is greater than 100", () => {
    const settings = new PlatformSettings({
      yearlySubscriptionDiscount: 120, // max: 100
    });

    const validationError = settings.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["yearlySubscriptionDiscount"]).toBeDefined();
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Validation] should fail validation if toViews is less than or equal to fromViews", () => {
    const settings = new PlatformSettings({
      yearlySubscriptionDiscount: 10,
      revenueBrackets: [
        {
          fromViews: 100,
          toViews: 80, // toViews <= fromViews should fail
          amountPerView: 0.1,
        },
      ],
    });

    const validationError = settings.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["revenueBrackets.0.toViews"]).toBeDefined();
    expect(validationError?.errors["revenueBrackets.0.toViews"].message).toContain(
      "The upper view count (Y) must be greater than the lower view count (X)."
    );
  });
});
