import { Faq, FaqStatus } from "../../src/models/faq.model";

describe("Faq Model Schema Validation", () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with all required fields and defaults", () => {
    const validFaq = new Faq({
      question: "How do I reset my password?",
      answer: "Go to settings and select Reset Password.",
    });

    const validationError = validFaq.validateSync();
    expect(validationError).toBeUndefined();
    expect(validFaq.status).toBe(FaqStatus.ACTIVE);
    expect(validFaq.order).toBe(0);
  });

  it("[Positive] should validate successfully with specific order and status", () => {
    const validFaq = new Faq({
      question: "Is there a subscription fee?",
      answer: "Yes, there are monthly and annual plans.",
      status: FaqStatus.INACTIVE,
      order: 5,
    });

    const validationError = validFaq.validateSync();
    expect(validationError).toBeUndefined();
    expect(validFaq.status).toBe(FaqStatus.INACTIVE);
    expect(validFaq.order).toBe(5);
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation if required fields are missing", () => {
    const invalidFaq = new Faq({
      // question and answer are missing
    });

    const validationError = invalidFaq.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["question"]).toBeDefined();
    expect(validationError?.errors["answer"]).toBeDefined();
  });

  it("[Negative] should fail validation if required field 'question' is missing", () => {
    const invalidFaq = new Faq({
      answer: "Sample answer",
    });

    const validationError = invalidFaq.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["question"]).toBeDefined();
    expect(validationError?.errors["answer"]).toBeUndefined();
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Validation] should fail validation if status is set to an invalid enum value", () => {
    const invalidFaq = new Faq({
      question: "Valid question?",
      answer: "Valid answer",
      status: "pending" as any, // Not active/inactive/deleted
    });

    const validationError = invalidFaq.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["status"]).toBeDefined();
    expect(validationError?.errors["status"].message).toContain("is not a valid enum value");
  });
});
