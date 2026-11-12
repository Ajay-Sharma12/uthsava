/// <reference types="jest" />
import { Watchlist } from "../../src/models/watch-list.model";
import mongoose from "mongoose";

describe("Watchlist Model Schema Validation", () => {
  const validUserId = new mongoose.Types.ObjectId();
  const validProfileId = new mongoose.Types.ObjectId();
  const validContentId = new mongoose.Types.ObjectId();

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with all required fields", () => {
    const item = new Watchlist({
      userId: validUserId,
      profileId: validProfileId,
      contentId: validContentId,
    });

    const error = item.validateSync();
    expect(error).toBeUndefined();
    expect(item.addedAt).toBeDefined();
  });

  it("[Positive] should validate with explicit addedAt", () => {
    const specificDate = new Date("2024-01-15T10:00:00Z");
    const item = new Watchlist({
      userId: validUserId,
      profileId: validProfileId,
      contentId: validContentId,
      addedAt: specificDate,
    });

    const error = item.validateSync();
    expect(error).toBeUndefined();
    expect(item.addedAt).toEqual(specificDate);
  });

  it("[Positive] should default addedAt to current date", () => {
    const before = Date.now();
    const item = new Watchlist({
      userId: validUserId,
      profileId: validProfileId,
      contentId: validContentId,
    });

    expect(item.addedAt).toBeDefined();
    // addedAt defaults to Date.now so should be >= our before timestamp
    expect(new Date(item.addedAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation when userId is missing", () => {
    const item = new Watchlist({
      profileId: validProfileId,
      contentId: validContentId,
    } as any);

    const error = item.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["userId"]).toBeDefined();
  });

  it("[Negative] should fail validation when profileId is missing", () => {
    const item = new Watchlist({
      userId: validUserId,
      contentId: validContentId,
    } as any);

    const error = item.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["profileId"]).toBeDefined();
  });

  it("[Negative] should fail validation when contentId is missing", () => {
    const item = new Watchlist({
      userId: validUserId,
      profileId: validProfileId,
    } as any);

    const error = item.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["contentId"]).toBeDefined();
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Edge] should accept ObjectId format for userId, profileId, contentId", () => {
    const item = new Watchlist({
      userId: new mongoose.Types.ObjectId(),
      profileId: new mongoose.Types.ObjectId(),
      contentId: new mongoose.Types.ObjectId(),
    });

    const error = item.validateSync();
    expect(error).toBeUndefined();
  });

  it("[Edge] should fail when invalid ObjectId string is used for userId", () => {
    const item = new Watchlist({
      userId: "not-an-object-id" as any,
      profileId: validProfileId,
      contentId: validContentId,
    });

    const error = item.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["userId"]).toBeDefined();
  });
});
