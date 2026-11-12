import {
  tutorialSlideIdParamSchema,
  createTutorialSlideSchema,
  updateTutorialSlideSchema,
  tutorialSlideStatusSchema,
  listTutorialSlidesQuerySchema,
} from "../../../../src/modules/admin/validators/tutorial-slide.validator";

describe("Tutorial Slide Validator Unit Tests", () => {
  describe("tutorialSlideIdParamSchema", () => {
    it("[Positive] should validate valid ObjectId param", () => {
      const { error } = tutorialSlideIdParamSchema.validate({ slideId: "507f1f77bcf86cd799439011" });
      expect(error).toBeUndefined();
    });

    it("[Validation/Edge] should fail for invalid slideId format", () => {
      const { error } = tutorialSlideIdParamSchema.validate({ slideId: "invalid-id" });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.invalidSlideIdFormat");
    });
  });

  describe("createTutorialSlideSchema", () => {
    it("[Positive] should validate valid image tutorial slide payload", () => {
      const { error, value } = createTutorialSlideSchema.validate({
        title: "Welcome Slide",
        description: "Welcome to Uthsava platform!",
        mediaType: "image",
        image: "slides/welcome.png",
        sequence: 1,
      });
      expect(error).toBeUndefined();
      expect(value.title).toBe("Welcome Slide");
    });

    it("[Positive] should validate valid video tutorial slide payload", () => {
      const { error } = createTutorialSlideSchema.validate({
        title: "Platform Demo",
        description: "Watch how to use features.",
        mediaType: "video",
        video: "slides/demo.mp4",
        sequence: 2,
      });
      expect(error).toBeUndefined();
    });

    it("[Validation/Edge] should fail when mediaType is image but image field is missing", () => {
      const { error } = createTutorialSlideSchema.validate({
        title: "Welcome Slide",
        description: "Welcome description",
        mediaType: "image",
        sequence: 1,
      });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.slideImageIsRequiredWhenMediaTypeIsImage");
    });

    it("[Validation/Edge] should fail when sequence is less than 1", () => {
      const { error } = createTutorialSlideSchema.validate({
        title: "Welcome Slide",
        description: "Welcome description",
        mediaType: "image",
        image: "slides/welcome.png",
        sequence: 0,
      });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.sequenceMustBeAtLeast1");
    });
  });

  describe("tutorialSlideStatusSchema & listTutorialSlidesQuerySchema", () => {
    it("[Positive] should validate status toggle", () => {
      const { error } = tutorialSlideStatusSchema.validate({ status: "active" });
      expect(error).toBeUndefined();
    });

    it("[Positive] should validate query filter parameters", () => {
      const { error } = listTutorialSlidesQuerySchema.validate({
        search: "welcome",
        mediaType: "image",
        page: 1,
        limit: 10,
      });
      expect(error).toBeUndefined();
    });
  });
});
