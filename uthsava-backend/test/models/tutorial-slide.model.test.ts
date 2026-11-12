import { TutorialSlide, SlideMediaType, SlideStatus } from "../../src/models/tutorial-slide.model";

describe("TutorialSlide Model Schema Validation", () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with all required fields and defaults", () => {
    const validSlide = new TutorialSlide({
      title: "Welcome aboard",
      description: "This is a detailed onboarding slide for the app.",
      mediaType: SlideMediaType.IMAGE,
      sequence: 1,
    });

    const validationError = validSlide.validateSync();
    expect(validationError).toBeUndefined();
    expect(validSlide.status).toBe(SlideStatus.ACTIVE);
    expect(validSlide.sequence).toBe(1);
  });

  it("[Positive] should validate successfully with video media type and specified status", () => {
    const validSlide = new TutorialSlide({
      title: "Walkthrough Video",
      description: "Watch how Uthsava works.",
      mediaType: SlideMediaType.VIDEO,
      video: "walkthrough.mp4",
      sequence: 2,
      status: SlideStatus.INACTIVE,
    });

    const validationError = validSlide.validateSync();
    expect(validationError).toBeUndefined();
    expect(validSlide.status).toBe(SlideStatus.INACTIVE);
    expect(validSlide.mediaType).toBe(SlideMediaType.VIDEO);
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation if required fields are missing", () => {
    const invalidSlide = new TutorialSlide({
      // title, description, mediaType, sequence are missing
    });

    const validationError = invalidSlide.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["title"]).toBeDefined();
    expect(validationError?.errors["description"]).toBeDefined();
    expect(validationError?.errors["mediaType"]).toBeDefined();
    expect(validationError?.errors["sequence"]).toBeDefined();
  });

  it("[Negative] should fail validation if sequence is less than 0", () => {
    const invalidSlide = new TutorialSlide({
      title: "Intro",
      description: "Welcome screen",
      mediaType: SlideMediaType.IMAGE,
      sequence: -1, // min: 0
    });

    const validationError = invalidSlide.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["sequence"]).toBeDefined();
    expect(validationError?.errors["sequence"].message).toContain("is less than minimum allowed value (0)");
  });

  it("[Negative] should fail validation if title is too short", () => {
    const invalidSlide = new TutorialSlide({
      title: "A", // minlength: 2
      description: "Welcome screen",
      mediaType: SlideMediaType.IMAGE,
      sequence: 1,
    });

    const validationError = invalidSlide.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["title"]).toBeDefined();
    expect(validationError?.errors["title"].message).toContain("is shorter than the minimum allowed length (2)");
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Validation] should fail validation if mediaType is set to an invalid enum value", () => {
    const invalidSlide = new TutorialSlide({
      title: "Intro",
      description: "Welcome screen",
      mediaType: "gif" as any, // Not image or video
      sequence: 1,
    });

    const validationError = invalidSlide.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["mediaType"]).toBeDefined();
    expect(validationError?.errors["mediaType"].message).toContain("is not a valid enum value");
  });

  it("[Validation] should fail validation if status is set to an invalid enum value", () => {
    const invalidSlide = new TutorialSlide({
      title: "Intro",
      description: "Welcome screen",
      mediaType: SlideMediaType.IMAGE,
      sequence: 1,
      status: "pending" as any, // Not active or inactive
    });

    const validationError = invalidSlide.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["status"]).toBeDefined();
    expect(validationError?.errors["status"].message).toContain("is not a valid enum value");
  });
});
