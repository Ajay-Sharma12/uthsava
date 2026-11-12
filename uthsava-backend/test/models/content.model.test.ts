import mongoose from "mongoose";
import { Content, ContentType, ContentStatus, AgeCategory, AgeRating, ContentApprovalStatus, UploadedByType } from "../../src/models/content.model";

describe("Content Model Schema Validation", () => {
  const mockLanguageId = new mongoose.Types.ObjectId();
  const mockCategoryId = new mongoose.Types.ObjectId();
  const mockUserId = new mongoose.Types.ObjectId();

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with all correct fields", () => {
    const validContent = new Content({
      title: "The Great Show",
      type: ContentType.MOVIE,
      status: ContentStatus.ACTIVE,
      ageCategory: AgeCategory.ADULTS,
      ageRating: AgeRating.A,
      approvalStatus: ContentApprovalStatus.APPROVED,
      languageIds: [mockLanguageId],
      genreIds: [mockCategoryId],
      description: "A gripping drama series.",
      uploadedBy: mockUserId,
      uploadedByType: UploadedByType.ADMIN,
      releaseDate: new Date(),
    });

    const validationError = validContent.validateSync();
    expect(validationError).toBeUndefined();
    expect(validContent.title).toBe("The Great Show");
    expect(validContent.type).toBe(ContentType.MOVIE);
  });

  it("[Positive] should set defaults correctly", () => {
    const content = new Content({
      title: "Simple Video",
      type: ContentType.MOVIE,
      uploadedBy: mockUserId,
      uploadedByType: UploadedByType.ADMIN,
      releaseDate: new Date(),
    });

    const validationError = content.validateSync();
    expect(validationError).toBeUndefined();
    // Verify defaults if any are defined on content
    expect(content.status).toBe(ContentStatus.ACTIVE);
    expect(content.approvalStatus).toBe(ContentApprovalStatus.PENDING);
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation if required field 'title' is missing", () => {
    const invalidContent = new Content({
      type: ContentType.MOVIE,
      uploadedBy: mockUserId,
      uploadedByType: UploadedByType.ADMIN,
      releaseDate: new Date(),
    });

    const validationError = invalidContent.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["title"]).toBeDefined();
    expect(validationError?.errors["title"].message).toContain("Path `title` is required");
  });

  it("[Negative] should fail validation if type enum is invalid", () => {
    const invalidContent = new Content({
      title: "My Movie",
      type: "SHORT_CLIP" as any,
      uploadedBy: mockUserId,
      uploadedByType: UploadedByType.ADMIN,
      releaseDate: new Date(),
    });

    const validationError = invalidContent.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["type"]).toBeDefined();
  });
});
