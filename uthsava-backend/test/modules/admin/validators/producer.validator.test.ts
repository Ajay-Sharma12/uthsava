import {
  producerIdParamSchema,
  createProducerSchema,
  updateProducerSchema,
  updateProducerStatusSchema,
  listProducersQuerySchema,
} from "../../../../src/modules/admin/validators/producer.validator";

describe("Producer Validator Unit Tests", () => {
  describe("producerIdParamSchema", () => {
    it("[Positive] should validate valid ObjectId", () => {
      const { error } = producerIdParamSchema.validate({ producerId: "507f1f77bcf86cd799439011" });
      expect(error).toBeUndefined();
    });

    it("[Validation/Edge] should fail for invalid ObjectId format", () => {
      const { error } = producerIdParamSchema.validate({ producerId: "invalid-id" });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.invalidProducerIdFormat");
    });
  });

  describe("createProducerSchema", () => {
    it("[Positive] should validate valid producer creation payload", () => {
      const { error, value } = createProducerSchema.validate({
        firstName: "Jane",
        lastName: "Doe",
        email: "jane.producer@example.com",
        mobile: "9876543210",
        companyName: "Uthsava Studios",
      });
      expect(error).toBeUndefined();
      expect(value.firstName).toBe("Jane");
    });

    it("[Validation] should fail if email format is invalid", () => {
      const { error } = createProducerSchema.validate({
        firstName: "Jane",
        email: "not-an-email",
        mobile: "9876543210",
      });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.pleaseProvideAValidEmailAddress");
    });

    it("[Validation] should fail if mobile number is not 8-12 digits", () => {
      const { error } = createProducerSchema.validate({
        firstName: "Jane",
        email: "jane@example.com",
        mobile: "123",
      });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.mobileNumberMustBeNumericAnd812Digits");
    });
  });

  describe("updateProducerStatusSchema & listProducersQuerySchema", () => {
    it("[Positive] should validate producer status update", () => {
      const { error } = updateProducerStatusSchema.validate({ status: "active" });
      expect(error).toBeUndefined();
    });

    it("[Positive] should validate list producers query parameters", () => {
      const { error } = listProducersQuerySchema.validate({
        search: "studios",
        status: "active",
        page: 1,
        limit: 10,
      });
      expect(error).toBeUndefined();
    });
  });
});
