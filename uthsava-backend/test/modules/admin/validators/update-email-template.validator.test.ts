import { updateEmailTemplateSchema } from "../../../../src/modules/admin/validators/update-email-template.validator";

describe("Update Email Template Validator Unit Tests", () => {
  it("[Positive] should validate valid update template body", () => {
    const { error, value } = updateEmailTemplateSchema.validate({
      title: "Password Reset Notice",
      subject: "Reset your password for {{Platform Name}}",
      description: "Hello {{userName}}, click {{resetLink}} to reset your password.",
      status: "active",
    });
    expect(error).toBeUndefined();
    expect(value.title).toBe("Password Reset Notice");
  });

  it("[Validation/Edge] should fail if forbidden keyword field is provided in update body", () => {
    const { error } = updateEmailTemplateSchema.validate({
      title: "Password Reset",
      keyword: "FORBIDDEN_KEYWORD_UPDATE",
    });
    expect(error).toBeDefined();
    expect(error?.details[0].message).toBe("validation.keywordCannotBeUpdated");
  });

  it("[Validation] should fail if subject is shorter than 5 characters", () => {
    const { error } = updateEmailTemplateSchema.validate({
      subject: "Hi",
    });
    expect(error).toBeDefined();
    expect(error?.details[0].message).toBe("validation.subjectMustBeAtLeast5Characters");
  });
});
