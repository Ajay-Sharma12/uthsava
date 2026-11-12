import {
  createCmsPageSchema,
  updateCmsPageSchema,
  updateCmsPageStatusSchema,
  updateCmsPagePublicationStatusSchema,
} from "../../../../src/modules/admin/validators/cms-page.validator";

describe("CMS Page Validator Unit Tests", () => {
  describe("createCmsPageSchema", () => {
    it("should validate correct cms page data (Positive)", () => {
      const { error, value } = createCmsPageSchema.validate({
        title: "About Us",
        content: "<p>About us content</p>",
        slug: "about-us",
      });
      expect(error).toBeUndefined();
      expect(value.title).toBe("About Us");
    });

    it("should fail when title is missing (Validation)", () => {
      const { error } = createCmsPageSchema.validate({ content: "<p>Content</p>" });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.titleIsRequired");
    });

    it("should fail when slug format is invalid (Validation/Edge)", () => {
      const { error } = createCmsPageSchema.validate({
        title: "Terms",
        content: "Content",
        slug: "Invalid Slug!",
      });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.slugMustContainOnlyLowercaseLettersNumbersAndHyphens");
    });
  });

  describe("updateCmsPageSchema", () => {
    it("should validate partial updates (Positive)", () => {
      const { error } = updateCmsPageSchema.validate({ title: "Updated Title" });
      expect(error).toBeUndefined();
    });

    it("should fail if title exceeds 200 chars (Validation)", () => {
      const { error } = updateCmsPageSchema.validate({ title: "a".repeat(201) });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.titleCannotExceed200Characters");
    });
  });

  describe("updateCmsPageStatusSchema", () => {
    it("should validate status update (Positive)", () => {
      const { error } = updateCmsPageStatusSchema.validate({ status: "active" });
      expect(error).toBeUndefined();
    });

    it("should fail for invalid status (Validation)", () => {
      const { error } = updateCmsPageStatusSchema.validate({ status: "INVALID_STATUS" });
      expect(error).toBeDefined();
    });
  });

  describe("updateCmsPagePublicationStatusSchema", () => {
    it("should validate publication status update (Positive)", () => {
      const { error } = updateCmsPagePublicationStatusSchema.validate({ publicationStatus: "published" });
      expect(error).toBeUndefined();
    });

    it("should fail if publicationStatus is missing (Validation)", () => {
      const { error } = updateCmsPagePublicationStatusSchema.validate({});
      expect(error).toBeDefined();
    });
  });
});
