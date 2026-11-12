/// <reference types="jest" />
import { EmailTemplate } from "../../src/models/email-template.model";

describe("EmailTemplate Model Schema Validation", () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with all required fields", () => {
    const template = new EmailTemplate({
      title: "Welcome Email",
      description: "This is the welcome email sent to new users.",
      slug: "welcome-email",
    });

    const error = template.validateSync();
    expect(error).toBeUndefined();
    expect(template.status).toBe("active");
  });

  it("[Positive] should validate successfully with all optional fields", () => {
    const template = new EmailTemplate({
      title: "OTP Email",
      subject: "Your OTP Code",
      description: "Email template for OTP delivery.",
      keyword: "{{otp}}",
      signature: "The Uthsava Team",
      keywordList: [{ key: "otp", value: "123456" }],
      status: "inactive",
      slug: "otp-email",
    });

    const error = template.validateSync();
    expect(error).toBeUndefined();
    expect(template.status).toBe("inactive");
    expect(template.subject).toBe("Your OTP Code");
  });

  it("[Positive] should default status to active", () => {
    const template = new EmailTemplate({
      title: "Reset Password",
      description: "Template for password reset.",
    });
    expect(template.status).toBe("active");
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation when title is missing", () => {
    const template = new EmailTemplate({
      description: "Some description",
    } as any);

    const error = template.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["title"]).toBeDefined();
  });

  it("[Negative] should fail validation when description is missing", () => {
    const template = new EmailTemplate({
      title: "Some Title",
    } as any);

    const error = template.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["description"]).toBeDefined();
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Validation] should fail validation with invalid status enum value", () => {
    const template = new EmailTemplate({
      title: "Some Title",
      description: "Some description",
      status: "archived" as any,
    });

    const error = template.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["status"]).toBeDefined();
  });

  it("[Edge] should accept empty keywordList array", () => {
    const template = new EmailTemplate({
      title: "Some Title",
      description: "Some description",
      keywordList: [],
      slug: "some-title",
    });

    const error = template.validateSync();
    expect(error).toBeUndefined();
  });

  it("[Edge] should store multiple keyword objects", () => {
    const keywords = [
      { key: "name", value: "John" },
      { key: "date", value: "2024-01-01" },
    ];
    const template = new EmailTemplate({
      title: "Some Title",
      description: "Some description",
      keywordList: keywords,
      slug: "some-title",
    });

    const error = template.validateSync();
    expect(error).toBeUndefined();
    expect(template.keywordList).toHaveLength(2);
  });
});
