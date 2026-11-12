/// <reference types="jest" />
import { WatchProgress } from "../../src/models/watch-progress.model";
import mongoose from "mongoose";

describe("WatchProgress Model Schema Validation", () => {
  const validUserId = new mongoose.Types.ObjectId();
  const validProfileId = new mongoose.Types.ObjectId();
  const validContentId = new mongoose.Types.ObjectId();

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with all required fields", () => {
    const progress = new WatchProgress({
      userId: validUserId,
      profileId: validProfileId,
      contentId: validContentId,
      watchedDuration: 1200,
      totalDuration: 5400,
    });

    const error = progress.validateSync();
    expect(error).toBeUndefined();
    expect(progress.isCompleted).toBe(false);
    expect(progress.watchedDuration).toBe(1200);
    expect(progress.totalDuration).toBe(5400);
  });

  it("[Positive] should validate with all optional fields including season and episode", () => {
    const seasonId = new mongoose.Types.ObjectId();
    const episodeId = new mongoose.Types.ObjectId();

    const progress = new WatchProgress({
      userId: validUserId,
      profileId: validProfileId,
      contentId: validContentId,
      seasonId,
      episodeId,
      watchedDuration: 2700,
      totalDuration: 2700,
      isCompleted: true,
      completedAt: new Date(),
      lastWatchedAt: new Date(),
    });

    const error = progress.validateSync();
    expect(error).toBeUndefined();
    expect(progress.isCompleted).toBe(true);
    expect(progress.seasonId).toBeDefined();
    expect(progress.episodeId).toBeDefined();
  });

  it("[Positive] should default isCompleted to false", () => {
    const progress = new WatchProgress({
      userId: validUserId,
      profileId: validProfileId,
      contentId: validContentId,
      watchedDuration: 0,
      totalDuration: 5400,
    });
    expect(progress.isCompleted).toBe(false);
  });

  it("[Positive] should default watchedDuration to 0", () => {
    const progress = new WatchProgress({
      userId: validUserId,
      profileId: validProfileId,
      contentId: validContentId,
      watchedDuration: 0,
      totalDuration: 1800,
    });
    expect(progress.watchedDuration).toBe(0);
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation when userId is missing", () => {
    const progress = new WatchProgress({
      profileId: validProfileId,
      contentId: validContentId,
      watchedDuration: 100,
      totalDuration: 5400,
    } as any);

    const error = progress.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["userId"]).toBeDefined();
  });

  it("[Negative] should fail validation when profileId is missing", () => {
    const progress = new WatchProgress({
      userId: validUserId,
      contentId: validContentId,
      watchedDuration: 100,
      totalDuration: 5400,
    } as any);

    const error = progress.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["profileId"]).toBeDefined();
  });

  it("[Negative] should fail validation when contentId is missing", () => {
    const progress = new WatchProgress({
      userId: validUserId,
      profileId: validProfileId,
      watchedDuration: 100,
      totalDuration: 5400,
    } as any);

    const error = progress.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["contentId"]).toBeDefined();
  });

  it("[Negative] should fail validation when totalDuration is missing", () => {
    const progress = new WatchProgress({
      userId: validUserId,
      profileId: validProfileId,
      contentId: validContentId,
      watchedDuration: 100,
    } as any);

    const error = progress.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["totalDuration"]).toBeDefined();
  });

  it("[Negative] should fail when watchedDuration is below min (0)", () => {
    const progress = new WatchProgress({
      userId: validUserId,
      profileId: validProfileId,
      contentId: validContentId,
      watchedDuration: -1,
      totalDuration: 5400,
    });

    const error = progress.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["watchedDuration"]).toBeDefined();
  });

  it("[Negative] should fail when totalDuration is below min (1)", () => {
    const progress = new WatchProgress({
      userId: validUserId,
      profileId: validProfileId,
      contentId: validContentId,
      watchedDuration: 0,
      totalDuration: 0,
    });

    const error = progress.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["totalDuration"]).toBeDefined();
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Edge] should accept watchedDuration of zero", () => {
    const progress = new WatchProgress({
      userId: validUserId,
      profileId: validProfileId,
      contentId: validContentId,
      watchedDuration: 0,
      totalDuration: 5400,
    });

    const error = progress.validateSync();
    expect(error).toBeUndefined();
  });

  it("[Edge] should accept totalDuration of exactly 1 (min)", () => {
    const progress = new WatchProgress({
      userId: validUserId,
      profileId: validProfileId,
      contentId: validContentId,
      watchedDuration: 0,
      totalDuration: 1,
    });

    const error = progress.validateSync();
    expect(error).toBeUndefined();
  });

  it("[Edge] should accept isCompleted=true with completedAt set", () => {
    const progress = new WatchProgress({
      userId: validUserId,
      profileId: validProfileId,
      contentId: validContentId,
      watchedDuration: 5400,
      totalDuration: 5400,
      isCompleted: true,
      completedAt: new Date(),
    });

    const error = progress.validateSync();
    expect(error).toBeUndefined();
    expect(progress.isCompleted).toBe(true);
    expect(progress.completedAt).toBeDefined();
  });
});
