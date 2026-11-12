/// <reference types="jest" />
import { Language, LanguageStatus } from "../../src/models/language.model";

describe("Language Model Schema Validation", () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with minimal required fields", () => {
    const lang = new Language({
      name: "English",
    });

    const validationError = lang.validateSync();
    expect(validationError).toBeUndefined();
    expect(lang.code).toBeNull();
    expect(lang.contentCount).toBe(0);
    expect(lang.status).toBe(LanguageStatus.ACTIVE);
  });

  it("[Positive] should validate successfully with all fields and custom status", () => {
    const lang = new Language({
      name: "Spanish",
      code: "es",
      contentCount: 42,
      status: LanguageStatus.INACTIVE,
    });

    const validationError = lang.validateSync();
    expect(validationError).toBeUndefined();
    expect(lang.name).toBe("Spanish");
    expect(lang.code).toBe("ES"); // Mongoose schema has trim and uppercase
    expect(lang.contentCount).toBe(42);
    expect(lang.status).toBe(LanguageStatus.INACTIVE);
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation if required field name is missing", () => {
    const lang = new Language({});

    const validationError = lang.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["name"]).toBeDefined();
  });

  it("[Negative] should fail validation if name exceeds maxlength of 100", () => {
    const lang = new Language({
      name: "a".repeat(101),
    });

    const validationError = lang.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["name"]).toBeDefined();
  });

  it("[Negative] should fail validation if code exceeds maxlength of 10", () => {
    const lang = new Language({
      name: "French",
      code: "abcdefghijk", // 11 characters
    });

    const validationError = lang.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["code"]).toBeDefined();
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Validation] should fail validation if status is set to an invalid enum value", () => {
    const lang = new Language({
      name: "Hindi",
      status: "PENDING" as any,
    });

    const validationError = lang.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["status"]).toBeDefined();
    expect(validationError?.errors["status"].message).toContain("is not a valid enum value");
  });
});
