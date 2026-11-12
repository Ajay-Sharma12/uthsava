import {
  createFaqSchema,
  updateFaqSchema,
  updateFaqStatusSchema,
} from "../../../../src/modules/admin/validators/faq.validator";

describe("FAQ Validator Unit Tests", () => {
  describe("createFaqSchema", () => {
    it("[Positive] should validate valid FAQ creation data", () => {
      const { error, value } = createFaqSchema.validate({
        question: "How to subscribe to plan?",
        answer: "Go to subscription page and pick a plan.",
        order: 1,
      });
      expect(error).toBeUndefined();
      expect(value.question).toBe("How to subscribe to plan?");
    });

    it("[Validation] should fail if question is shorter than 5 characters", () => {
      const { error } = createFaqSchema.validate({
        question: "Why",
        answer: "Answer text",
      });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.questionMustBeAtLeast5CharactersLong");
    });

    it("[Validation] should fail if answer is missing", () => {
      const { error } = createFaqSchema.validate({
        question: "How to reset password?",
      });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.answerIsRequired");
    });
  });

  describe("updateFaqSchema & updateFaqStatusSchema", () => {
    it("[Positive] should validate partial update", () => {
      const { error } = updateFaqSchema.validate({
        question: "Updated question text?",
      });
      expect(error).toBeUndefined();
    });

    it("[Positive] should validate FAQ status update", () => {
      const { error } = updateFaqStatusSchema.validate({ status: "active" });
      expect(error).toBeUndefined();
    });

    it("[Validation/Edge] should fail if order is negative", () => {
      const { error } = updateFaqSchema.validate({ order: -5 });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.orderCannotBeNegative");
    });
  });
});
