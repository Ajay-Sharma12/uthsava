import {
  subAdminIdParamSchema,
  createSubAdminSchema,
  updateSubAdminSchema,
  updateSubAdminStatusSchema,
  listSubAdminsFiltersSchema,
} from "../../../../src/modules/admin/validators/subadmin.validator";

describe("SubAdmin Validator Unit Tests", () => {
  describe("subAdminIdParamSchema", () => {
    it("should validate valid subAdminId ObjectId (Positive)", () => {
      const { error } = subAdminIdParamSchema.validate({ subAdminId: "507f1f77bcf86cd799439011" });
      expect(error).toBeUndefined();
    });

    it("should fail for invalid subAdminId (Validation/Edge)", () => {
      const { error } = subAdminIdParamSchema.validate({ subAdminId: "123-invalid" });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.invalidSubadminIdFormat");
    });
  });

  describe("createSubAdminSchema", () => {
    it("should validate valid subadmin creation input (Positive)", () => {
      const { error, value } = createSubAdminSchema.validate({
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        mobile: "9876543210",
        roleId: "507f1f77bcf86cd799439011",
      });
      expect(error).toBeUndefined();
      expect(value.firstName).toBe("John");
    });

    it("should fail if firstName contains numbers or special characters (Validation)", () => {
      const { error } = createSubAdminSchema.validate({
        firstName: "John123",
        lastName: "Doe",
        email: "john@example.com",
        roleId: "507f1f77bcf86cd799439011",
      });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe("validation.firstNameMustContainAlphabeticCharactersOnly");
    });

    it("should fail if mobile is not 8 to 12 digits (Validation)", () => {
      const { error } = createSubAdminSchema.validate({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        mobile: "123",
        roleId: "507f1f77bcf86cd799439011",
      });
      expect(error).toBeDefined();
    });
  });

  describe("updateSubAdminStatusSchema & listSubAdminsFiltersSchema", () => {
    it("should validate subadmin status update (Positive)", () => {
      const { error } = updateSubAdminStatusSchema.validate({ status: "active" });
      expect(error).toBeUndefined();
    });

    it("should validate list filters (Positive)", () => {
      const { error } = listSubAdminsFiltersSchema.validate({
        search: "John",
        status: "active",
        page: 1,
        limit: 10,
      });
      expect(error).toBeUndefined();
    });
  });
});
