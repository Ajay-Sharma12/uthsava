import {
  emailTemplateIdParamSchema,
  emailTemplateStatusSchema,
  createEmailTemplateSchema,
  emailTemplateListFiltersSchema,
} from "../../../../src/modules/admin/validators/email-template.validator";

describe("Email Template Validator Unit Tests", () => {
  describe("emailTemplateIdParamSchema", () => {
    it("should validate valid templateId ObjectId (Positive)", () => {
      const { error } = emailTemplateIdParamSchema.validate({ templateId: "507f1f77bcf86cd799439011" });
      expect(error).toBeUndefined();
    });

    it("should fail for invalid templateId (Validation)", () => {
      const { error } = emailTemplateIdParamSchema.validate({ templateId: "invalid-id" });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.invalidEmailTemplateIdFormat");
    });
  });

  describe("createEmailTemplateSchema", () => {
    it("should validate complete creation schema (Positive)", () => {
      const { error, value } = createEmailTemplateSchema.validate({
        title: "Welcome Email",
        subject: "Welcome to Uthsava!",
        description: "Dear user, welcome to our platform.",
        status: "active",
      });
      expect(error).toBeUndefined();
      expect(value.title).toBe("Welcome Email");
    });

    it("should fail if subject is too short (Validation)", () => {
      const { error } = createEmailTemplateSchema.validate({
        title: "Welcome Email",
        subject: "Hi",
        description: "Dear user, welcome to our platform.",
      });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.subjectMustBeAtLeast5Characters");
    });
  });

  describe("emailTemplateStatusSchema & emailTemplateListFiltersSchema", () => {
    it("should validate status schema (Positive)", () => {
      const { error } = emailTemplateStatusSchema.validate({ status: "active" });
      expect(error).toBeUndefined();
    });

    it("should validate list filters (Positive)", () => {
      const { error } = emailTemplateListFiltersSchema.validate({
        search: "welcome",
        page: 1,
        limit: 20,
        sortOrder: "asc",
      });
      expect(error).toBeUndefined();
    });
  });
});
