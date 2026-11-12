/// <reference types="jest" />
import {
  createAvatarCategorySchema,
  createAvatarSchema,
  updateAvatarSchema,
  getAvatarsQuerySchema,
  adminListAvatarsQuerySchema,
  avatarStatusSchema,
  avatarIdParamSchema,
  createSubProfileSchema,
} from "../../../../src/modules/avatar/validators/avatar.validator";

describe("Avatar Validator Schemas Unit Tests", () => {
  describe("createAvatarCategorySchema", () => {
    it("[Positive] should validate valid category input", () => {
      const { error, value } = createAvatarCategorySchema.validate({
        category: "Sci-Fi",
        isKids: true,
      });
      expect(error).toBeUndefined();
      expect(value.category).toBe("Sci-Fi");
    });

    it("[Validation/Negative] should fail when neither category nor name is provided", () => {
      const { error } = createAvatarCategorySchema.validate({});
      expect(error).toBeDefined();
    });
  });

  describe("createAvatarSchema", () => {
    it("[Positive] should validate valid avatar payload", () => {
      const { error } = createAvatarSchema.validate({
        category: "Superhero",
        images: ["image1.png"],
      });
      expect(error).toBeUndefined();
    });

    it("[Validation/Negative] should fail when category is missing or empty", () => {
      const { error } = createAvatarSchema.validate({
        images: ["image1.png"],
      });
      expect(error).toBeDefined();
    });

    it("[Validation/Negative] should fail when images exceeds 10 items", () => {
      const { error } = createAvatarSchema.validate({
        category: "Superhero",
        images: Array(11).fill("img.png"),
      });
      expect(error).toBeDefined();
    });
  });

  describe("updateAvatarSchema", () => {
    it("[Positive] should validate partial update payload", () => {
      const { error } = updateAvatarSchema.validate({
        category: "Updated Category",
        isKids: false,
      });
      expect(error).toBeUndefined();
    });
  });

  describe("getAvatarsQuerySchema & adminListAvatarsQuerySchema", () => {
    it("[Positive] should validate public query params", () => {
      const { error, value } = getAvatarsQuerySchema.validate({
        page: 2,
        limit: 15,
        isKids: true,
      });
      expect(error).toBeUndefined();
      expect(value.page).toBe(2);
    });

    it("[Positive] should validate admin query params", () => {
      const { error, value } = adminListAvatarsQuerySchema.validate({
        search: "Batman",
        page: 1,
        limit: 20,
        sortOrder: "asc",
      });
      expect(error).toBeUndefined();
      expect(value.search).toBe("Batman");
    });
  });

  describe("avatarStatusSchema & avatarIdParamSchema", () => {
    it("[Positive] should validate status active or inactive", () => {
      expect(avatarStatusSchema.validate({ status: "active" }).error).toBeUndefined();
      expect(avatarStatusSchema.validate({ status: "inactive" }).error).toBeUndefined();
    });

    it("[Validation/Negative] should fail for invalid status value", () => {
      expect(avatarStatusSchema.validate({ status: "invalid" }).error).toBeDefined();
    });

    it("[Positive] should validate valid 24-char hex ObjectId avatarId", () => {
      const validHex = "507f1f77bcf86cd799439011";
      expect(avatarIdParamSchema.validate({ avatarId: validHex }).error).toBeUndefined();
    });

    it("[Validation/Negative] should fail for non-hex or invalid length avatarId", () => {
      expect(avatarIdParamSchema.validate({ avatarId: "short" }).error).toBeDefined();
    });
  });

  describe("createSubProfileSchema", () => {
    it("[Positive] should validate valid sub-profile creation schema", () => {
      const { error, value } = createSubProfileSchema.validate({
        name: "Junior",
        isKids: true,
      });
      expect(error).toBeUndefined();
      expect(value.name).toBe("Junior");
    });

    it("[Validation/Negative] should fail when name is shorter than 2 characters", () => {
      const { error } = createSubProfileSchema.validate({ name: "A" });
      expect(error).toBeDefined();
    });
  });
});
