/// <reference types="jest" />
import { AwardBadge, AwardBadgeType, AwardBadgeStatus } from "../../src/models/award-badge.model";

describe("AwardBadge Model Schema Validation", () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with all required fields - AWARD type", () => {
    const badge = new AwardBadge({
      type: AwardBadgeType.AWARD,
      name: "Best Drama Award",
    });

    const error = badge.validateSync();
    expect(error).toBeUndefined();
    expect(badge.status).toBe(AwardBadgeStatus.ACTIVE);
    expect(badge.contentIds).toEqual([]);
  });

  it("[Positive] should validate successfully with BADGE type", () => {
    const badge = new AwardBadge({
      type: AwardBadgeType.BADGE,
      name: "Top Rated Badge",
      status: AwardBadgeStatus.INACTIVE,
    });

    const error = badge.validateSync();
    expect(error).toBeUndefined();
    expect(badge.status).toBe(AwardBadgeStatus.INACTIVE);
    expect(badge.type).toBe(AwardBadgeType.BADGE);
  });

  it("[Positive] should default status to ACTIVE", () => {
    const badge = new AwardBadge({
      type: AwardBadgeType.AWARD,
      name: "Golden Globe",
    });
    expect(badge.status).toBe(AwardBadgeStatus.ACTIVE);
  });

  it("[Positive] should accept contentIds array", () => {
    const badge = new AwardBadge({
      type: AwardBadgeType.BADGE,
      name: "Popular Choice",
      contentIds: ["64f0000000000000000000a1", "64f0000000000000000000a2"],
    });

    const error = badge.validateSync();
    expect(error).toBeUndefined();
    expect(badge.contentIds).toHaveLength(2);
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation when type is missing", () => {
    const badge = new AwardBadge({
      name: "Some Award",
    } as any);

    const error = badge.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["type"]).toBeDefined();
  });

  it("[Negative] should fail validation when name is missing", () => {
    const badge = new AwardBadge({
      type: AwardBadgeType.AWARD,
    } as any);

    const error = badge.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["name"]).toBeDefined();
  });

  it("[Negative] should fail validation when name is below minlength of 2", () => {
    const badge = new AwardBadge({
      type: AwardBadgeType.AWARD,
      name: "A",
    });

    const error = badge.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["name"]).toBeDefined();
  });

  it("[Negative] should fail validation when name exceeds maxlength of 200", () => {
    const badge = new AwardBadge({
      type: AwardBadgeType.AWARD,
      name: "A".repeat(201),
    });

    const error = badge.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["name"]).toBeDefined();
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Validation] should fail validation with invalid type enum value", () => {
    const badge = new AwardBadge({
      type: "trophy" as any,
      name: "Some Award",
    });

    const error = badge.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["type"]).toBeDefined();
  });

  it("[Validation] should fail validation with invalid status enum value", () => {
    const badge = new AwardBadge({
      type: AwardBadgeType.AWARD,
      name: "Some Award",
      status: "archived" as any,
    });

    const error = badge.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["status"]).toBeDefined();
  });

  it("[Edge] should accept name at exactly min length (2 chars)", () => {
    const badge = new AwardBadge({
      type: AwardBadgeType.BADGE,
      name: "AB",
    });

    const error = badge.validateSync();
    expect(error).toBeUndefined();
  });

  it("[Edge] should accept name at exactly max length (200 chars)", () => {
    const badge = new AwardBadge({
      type: AwardBadgeType.BADGE,
      name: "A".repeat(200),
    });

    const error = badge.validateSync();
    expect(error).toBeUndefined();
  });
});
