import mongoose from "mongoose";
import { Season } from "../../src/models/season.model";

describe("Season Model Schema Validation", () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with minimal required fields", () => {
    const season = new Season({
      contentId: new mongoose.Types.ObjectId(),
      seasonNumber: 1,
    });

    const validationError = season.validateSync();
    expect(validationError).toBeUndefined();
    expect(season.totalEpisodes).toBe(0);
    expect(season.castCrew).toHaveLength(0);
  });

  it("[Positive] should validate successfully with all optional properties and nested CastCrew", () => {
    const season = new Season({
      contentId: new mongoose.Types.ObjectId(),
      seasonNumber: 2,
      title: "Season 2: The Uprising",
      description: "Description of season 2",
      totalEpisodes: 12,
      releaseYear: 2026,
      poster: ["poster-url.jpg"],
      banner: ["banner-url.jpg"],
      thumbnail: "thumbnail-url.jpg",
      teaserVideo: ["teaser-url.mp4"],
      castCrew: [
        {
          name: "Actor A",
          role: "Main Character",
          image: "actor-a.jpg",
        },
      ],
    });

    const validationError = season.validateSync();
    expect(validationError).toBeUndefined();
    expect(season.castCrew?.[0]?.name).toBe("Actor A");
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation if required fields are missing", () => {
    const season = new Season({});

    const validationError = season.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["contentId"]).toBeDefined();
    expect(validationError?.errors["seasonNumber"]).toBeDefined();
  });

  it("[Negative] should fail validation if releaseYear is less than 1900", () => {
    const season = new Season({
      contentId: new mongoose.Types.ObjectId(),
      seasonNumber: 1,
      releaseYear: 1899, // min: 1900
    });

    const validationError = season.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["releaseYear"]).toBeDefined();
  });

  it("[Negative] should fail validation if releaseYear is greater than 3000", () => {
    const season = new Season({
      contentId: new mongoose.Types.ObjectId(),
      seasonNumber: 1,
      releaseYear: 3001, // max: 3000
    });

    const validationError = season.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["releaseYear"]).toBeDefined();
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Validation] should fail validation if CastCrew name is missing", () => {
    const season = new Season({
      contentId: new mongoose.Types.ObjectId(),
      seasonNumber: 1,
      castCrew: [
        {
          role: "Director", // name is required
        } as any,
      ],
    });

    const validationError = season.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["castCrew.0.name"]).toBeDefined();
  });

  it("[Validation] should fail validation if CastCrew name exceeds maxlength of 100", () => {
    const season = new Season({
      contentId: new mongoose.Types.ObjectId(),
      seasonNumber: 1,
      castCrew: [
        {
          name: "a".repeat(101),
          role: "Director",
        },
      ],
    });

    const validationError = season.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["castCrew.0.name"]).toBeDefined();
  });
});
