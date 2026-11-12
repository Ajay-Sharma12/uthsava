import {
  contentIdParamSchema,
  createContentSchema,
  updateContentSchema,
  updateContentStatusSchema,
  createSeasonSchema,
  createEpisodeSchema,
  listContentsQuerySchema,
} from "../../../../src/modules/admin/validators/content.validator";

describe("Content Validator Unit Tests", () => {
  describe("contentIdParamSchema", () => {
    it("[Positive] should validate valid contentId ObjectId", () => {
      const { error } = contentIdParamSchema.validate({ contentId: "507f1f77bcf86cd799439011" });
      expect(error).toBeUndefined();
    });

    it("[Validation/Edge] should fail for invalid contentId format", () => {
      const { error } = contentIdParamSchema.validate({ contentId: "invalid-id" });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.invalidContentIdFormat");
    });
  });

  describe("createContentSchema", () => {
    it("[Positive] should validate movie content creation payload", () => {
      const { error, value } = createContentSchema.validate({
        title: "Inception",
        type: "MOVIE",
        poster: "https://example.com/poster.jpg",
        thumbnail: "https://example.com/thumb.png",
        mainVideo: "https://example.com/movie.mp4",
      });
      expect(error).toBeUndefined();
      expect(value.title).toBe("Inception");
    });

    it("[Validation] should fail when movie creation is missing mainVideo", () => {
      const { error } = createContentSchema.validate({
        title: "Inception",
        type: "MOVIE",
        poster: "https://example.com/poster.jpg",
        thumbnail: "https://example.com/thumb.png",
      });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.mainVideoFileIsRequiredForMovies");
    });

    it("[Validation/Edge] should fail when mainVideo has invalid file extension", () => {
      const { error } = createContentSchema.validate({
        title: "Inception",
        type: "MOVIE",
        poster: "https://example.com/poster.jpg",
        thumbnail: "https://example.com/thumb.png",
        mainVideo: "https://example.com/movie.pdf",
      });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.mainVideoMustBeMp4MkvMovAviOrWebm");
    });
  });

  describe("createSeasonSchema & createEpisodeSchema", () => {
    it("[Positive] should validate season creation payload", () => {
      const { error } = createSeasonSchema.validate({
        seasonNumber: 1,
        title: "Season 1",
        description: "First season of series",
      });
      expect(error).toBeUndefined();
    });

    it("[Positive] should validate episode creation payload", () => {
      const { error } = createEpisodeSchema.validate({
        episodeNumber: 1,
        title: "Pilot",
        duration: 45,
        videoFile: "https://example.com/ep1.mp4",
        thumbnailImage: "https://example.com/ep1.jpg",
      });
      expect(error).toBeUndefined();
    });

    it("[Validation] should fail when episode is missing videoFile", () => {
      const { error } = createEpisodeSchema.validate({
        episodeNumber: 1,
        title: "Pilot",
        thumbnailImage: "https://example.com/ep1.jpg",
      });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.episodeVideoFileIsRequired");
    });
  });

  describe("listContentsQuerySchema", () => {
    it("[Positive] should validate list content filters", () => {
      const { error } = listContentsQuerySchema.validate({
        search: "inception",
        type: "MOVIE",
        page: 1,
        limit: 10,
      });
      expect(error).toBeUndefined();
    });
  });
});
