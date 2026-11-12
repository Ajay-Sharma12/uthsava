import mongoose from "mongoose";
import { Episode, EpisodeStatus } from "../../src/models/episode.model";

describe("Episode Model Schema Validation", () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with all required fields and defaults", () => {
    const validEpisode = new Episode({
      contentId: new mongoose.Types.ObjectId(),
      seasonId: new mongoose.Types.ObjectId(),
      title: "Pilot Episode",
      episodeNumber: 1,
      releaseDate: new Date(),
    });

    const validationError = validEpisode.validateSync();
    expect(validationError).toBeUndefined();
    expect(validEpisode.status).toBe(EpisodeStatus.ACTIVE);
    expect(validEpisode.adsEnables).toBe(false);
    expect(validEpisode.freePreviewEnabled).toBe(false);
    expect(validEpisode.freePreviewDuration).toBe(0);
  });

  it("[Positive] should validate successfully with full optional fields", () => {
    const validEpisode = new Episode({
      contentId: new mongoose.Types.ObjectId(),
      seasonId: new mongoose.Types.ObjectId(),
      title: "Episode 2: The Return",
      description: "A summary of the episode details.",
      duration: 2700,
      episodeNumber: 2,
      thumbnail: "thumbnail.jpg",
      video: "video-file.mp4",
      status: EpisodeStatus.INACTIVE,
      availableQualities: ["1080p", "4K"],
      adsEnables: true,
      freePreviewEnabled: true,
      freePreviewDuration: 300,
      releaseDate: new Date(),
    });

    const validationError = validEpisode.validateSync();
    expect(validationError).toBeUndefined();
    expect(validEpisode.status).toBe(EpisodeStatus.INACTIVE);
    expect(validEpisode.adsEnables).toBe(true);
    expect(validEpisode.freePreviewEnabled).toBe(true);
    expect(validEpisode.freePreviewDuration).toBe(300);
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation if required fields are missing", () => {
    const invalidEpisode = new Episode({
      // contentId, seasonId, title, episodeNumber, and releaseDate are missing
    });

    const validationError = invalidEpisode.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["contentId"]).toBeDefined();
    expect(validationError?.errors["seasonId"]).toBeDefined();
    expect(validationError?.errors["title"]).toBeDefined();
    expect(validationError?.errors["episodeNumber"]).toBeDefined();
    expect(validationError?.errors["releaseDate"]).toBeDefined();
  });

  it("[Negative] should fail validation if freePreviewDuration is negative", () => {
    const invalidEpisode = new Episode({
      contentId: new mongoose.Types.ObjectId(),
      seasonId: new mongoose.Types.ObjectId(),
      title: "Invalid Preview Duration",
      episodeNumber: 3,
      releaseDate: new Date(),
      freePreviewDuration: -10, // min: 0
    });

    const validationError = invalidEpisode.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["freePreviewDuration"]).toBeDefined();
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Validation] should fail validation if status is set to an invalid enum value", () => {
    const invalidEpisode = new Episode({
      contentId: new mongoose.Types.ObjectId(),
      seasonId: new mongoose.Types.ObjectId(),
      title: "Invalid Status",
      episodeNumber: 4,
      releaseDate: new Date(),
      status: "DELETED" as any, // Not active/inactive
    });

    const validationError = invalidEpisode.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["status"]).toBeDefined();
    expect(validationError?.errors["status"].message).toContain("is not a valid enum value");
  });

  it("[Validation] should fail validation if availableQualities contains an invalid quality enum", () => {
    const invalidEpisode = new Episode({
      contentId: new mongoose.Types.ObjectId(),
      seasonId: new mongoose.Types.ObjectId(),
      title: "Invalid Quality",
      episodeNumber: 5,
      releaseDate: new Date(),
      availableQualities: ["1080p", "10000p" as any], // 10000p is not a valid enum value
    });

    const validationError = invalidEpisode.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["availableQualities.1"]).toBeDefined();
    expect(validationError?.errors["availableQualities.1"].message).toContain("is not a valid enum value");
  });
});
