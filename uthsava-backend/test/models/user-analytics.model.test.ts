/// <reference types="jest" />
import { UserAnalytics } from "../../src/models/user-analytics.model";
import mongoose from "mongoose";

describe("UserAnalytics Model Schema Validation", () => {
  const validUserId = new mongoose.Types.ObjectId();

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with only userId (all others have defaults)", () => {
    const analytics = new UserAnalytics({
      userId: validUserId,
    });

    const error = analytics.validateSync();
    expect(error).toBeUndefined();
    expect(analytics.totalWatchDuration).toBe(0);
    expect(analytics.totalMoviesWatched).toBe(0);
    expect(analytics.totalEpisodesWatched).toBe(0);
    expect(analytics.totalCompletedMovies).toBe(0);
    expect(analytics.totalCompletedEpisodes).toBe(0);
    expect(analytics.totalWatchlistItems).toBe(0);
    expect(analytics.totalDownloads).toBe(0);
  });

  it("[Positive] should validate with all fields explicitly set", () => {
    const analytics = new UserAnalytics({
      userId: validUserId,
      totalWatchDuration: 3600,
      totalMoviesWatched: 10,
      totalEpisodesWatched: 50,
      totalCompletedMovies: 8,
      totalCompletedEpisodes: 45,
      totalWatchlistItems: 20,
      totalDownloads: 5,
    });

    const error = analytics.validateSync();
    expect(error).toBeUndefined();
    expect(analytics.totalWatchDuration).toBe(3600);
    expect(analytics.totalMoviesWatched).toBe(10);
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation when userId is missing", () => {
    const analytics = new UserAnalytics({} as any);
    const error = analytics.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["userId"]).toBeDefined();
  });

  it("[Negative] should fail when totalWatchDuration is below min (0)", () => {
    const analytics = new UserAnalytics({
      userId: validUserId,
      totalWatchDuration: -1,
    });

    const error = analytics.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["totalWatchDuration"]).toBeDefined();
  });

  it("[Negative] should fail when totalMoviesWatched is below min (0)", () => {
    const analytics = new UserAnalytics({
      userId: validUserId,
      totalMoviesWatched: -5,
    });

    const error = analytics.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["totalMoviesWatched"]).toBeDefined();
  });

  it("[Negative] should fail when totalDownloads is below min (0)", () => {
    const analytics = new UserAnalytics({
      userId: validUserId,
      totalDownloads: -1,
    });

    const error = analytics.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["totalDownloads"]).toBeDefined();
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Edge] should accept zero values for all counters", () => {
    const analytics = new UserAnalytics({
      userId: validUserId,
      totalWatchDuration: 0,
      totalMoviesWatched: 0,
      totalEpisodesWatched: 0,
      totalCompletedMovies: 0,
      totalCompletedEpisodes: 0,
      totalWatchlistItems: 0,
      totalDownloads: 0,
    });

    const error = analytics.validateSync();
    expect(error).toBeUndefined();
  });

  it("[Edge] should accept large counter values", () => {
    const analytics = new UserAnalytics({
      userId: validUserId,
      totalWatchDuration: 999999,
      totalMoviesWatched: 10000,
      totalEpisodesWatched: 50000,
    });

    const error = analytics.validateSync();
    expect(error).toBeUndefined();
  });
});
