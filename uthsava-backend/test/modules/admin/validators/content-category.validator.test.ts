import {
  contentCategoryIdParamSchema,
  createContentCategorySchema,
  updateContentCategorySchema,
  updateContentCategoryStatusSchema,
  updateDisplayOrderSchema,
  listContentCategoriesQuerySchema,
} from "../../../../src/modules/admin/validators/content-category.validator";

describe("ContentCategory Validator Unit Tests", () => {
  describe("contentCategoryIdParamSchema", () => {
    it("[Positive] should validate a valid 24-character ObjectId", () => {
      const { error } = contentCategoryIdParamSchema.validate({ categoryId: "507f1f77bcf86cd799439011" });
      expect(error).toBeUndefined();
    });

    it("[Validation/Edge] should fail for invalid ObjectId format", () => {
      const { error } = contentCategoryIdParamSchema.validate({ categoryId: "invalid-id" });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.invalidCategoryIdFormat");
    });
  });

  describe("createContentCategorySchema", () => {
    it("[Positive] should validate category creation successfully", () => {
      const { error, value } = createContentCategorySchema.validate({
        name: "Action",
        type: "category",
        description: "Action content",
        displayOrder: 1,
      });
      expect(error).toBeUndefined();
      expect(value.name).toBe("Action");
    });

    it("[Positive] should validate genre creation with icon image", () => {
      const { error } = createContentCategorySchema.validate({
        name: "Thriller",
        type: "genre",
        icon: "https://example.com/icon.png",
      });
      expect(error).toBeUndefined();
    });

    it("[Validation] should fail when name is missing", () => {
      const { error } = createContentCategorySchema.validate({ type: "category" });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.nameIsRequired");
    });

    it("[Validation/Edge] should fail when genre is missing mandatory icon image", () => {
      const { error } = createContentCategorySchema.validate({
        name: "Thriller",
        type: "genre",
      });
      expect(error).toBeDefined();
    });
  });

  describe("updateContentCategoryStatusSchema & updateDisplayOrderSchema", () => {
    it("[Positive] should validate status update", () => {
      const { error } = updateContentCategoryStatusSchema.validate({ status: "active" });
      expect(error).toBeUndefined();
    });

    it("[Positive] should validate display order update", () => {
      const { error } = updateDisplayOrderSchema.validate({ displayOrder: 5 });
      expect(error).toBeUndefined();
    });

    it("[Validation] should fail when displayOrder is negative", () => {
      const { error } = updateDisplayOrderSchema.validate({ displayOrder: -1 });
      expect(error).toBeDefined();
    });
  });

  describe("listContentCategoriesQuerySchema", () => {
    it("[Positive] should validate list query params", () => {
      const { error } = listContentCategoriesQuerySchema.validate({
        type: "category",
        page: 1,
        limit: 10,
      });
      expect(error).toBeUndefined();
    });
  });
});
