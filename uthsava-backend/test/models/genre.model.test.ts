/// <reference types="jest" />
import { Genre, GenreStatus, type as GenreType } from "../../src/models/genre.model";

describe("Genre Model Schema Validation", () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with all required fields - GENRE type", () => {
    const genre = new Genre({
      name: "Action",
      type: GenreType.GENRE,
    });

    const error = genre.validateSync();
    expect(error).toBeUndefined();
    expect(genre.status).toBe(GenreStatus.ACTIVE);
    expect(genre.displayOrder).toBe(0);
    expect(genre.contentCount).toBe(0);
  });

  it("[Positive] should validate successfully with CATEGORY type", () => {
    const genre = new Genre({
      name: "Movies",
      type: GenreType.CATEGORY,
      displayOrder: 1,
      status: GenreStatus.ACTIVE,
    });

    const error = genre.validateSync();
    expect(error).toBeUndefined();
    expect(genre.type).toBe(GenreType.CATEGORY);
    expect(genre.displayOrder).toBe(1);
  });

  it("[Positive] should validate with all optional fields", () => {
    const genre = new Genre({
      name: "Drama",
      type: GenreType.GENRE,
      description: "Dramatic and emotional content",
      icon: "drama-icon.png",
      slug: "drama",
      seoTitle: "Watch Drama Content",
      seoDescription: "Discover the best drama series and movies.",
      status: GenreStatus.INACTIVE,
    });

    const error = genre.validateSync();
    expect(error).toBeUndefined();
    expect(genre.description).toBe("Dramatic and emotional content");
    expect(genre.status).toBe(GenreStatus.INACTIVE);
  });

  it("[Positive] should default status to ACTIVE", () => {
    const genre = new Genre({ name: "Comedy", type: GenreType.GENRE });
    expect(genre.status).toBe(GenreStatus.ACTIVE);
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation when name is missing", () => {
    const genre = new Genre({ type: GenreType.GENRE } as any);
    const error = genre.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["name"]).toBeDefined();
  });

  it("[Negative] should fail validation when type is missing", () => {
    const genre = new Genre({ name: "Action" } as any);
    const error = genre.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["type"]).toBeDefined();
  });

  it("[Negative] should fail validation when name exceeds maxlength of 100", () => {
    const genre = new Genre({
      name: "A".repeat(101),
      type: GenreType.GENRE,
    });
    const error = genre.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["name"]).toBeDefined();
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Validation] should fail validation with invalid type enum value", () => {
    const genre = new Genre({
      name: "Comedy",
      type: "movie" as any,
    });
    const error = genre.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["type"]).toBeDefined();
  });

  it("[Validation] should fail validation with invalid status enum value", () => {
    const genre = new Genre({
      name: "Comedy",
      type: GenreType.GENRE,
      status: "deleted" as any,
    });
    const error = genre.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["status"]).toBeDefined();
  });

  it("[Validation] should fail when seoTitle exceeds maxlength of 60", () => {
    const genre = new Genre({
      name: "Comedy",
      type: GenreType.GENRE,
      seoTitle: "A".repeat(61),
    });
    const error = genre.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["seoTitle"]).toBeDefined();
  });

  it("[Validation] should fail when seoDescription exceeds maxlength of 160", () => {
    const genre = new Genre({
      name: "Comedy",
      type: GenreType.GENRE,
      seoDescription: "A".repeat(161),
    });
    const error = genre.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["seoDescription"]).toBeDefined();
  });

  it("[Edge] should accept exactly max name length (100 chars)", () => {
    const genre = new Genre({
      name: "A".repeat(100),
      type: GenreType.GENRE,
    });
    const error = genre.validateSync();
    expect(error).toBeUndefined();
  });

  it("[Edge] should accept description up to 500 chars", () => {
    const genre = new Genre({
      name: "Drama",
      type: GenreType.GENRE,
      description: "D".repeat(500),
    });
    const error = genre.validateSync();
    expect(error).toBeUndefined();
  });

  it("[Edge] should fail when description exceeds 500 chars", () => {
    const genre = new Genre({
      name: "Drama",
      type: GenreType.GENRE,
      description: "D".repeat(501),
    });
    const error = genre.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["description"]).toBeDefined();
  });
});
