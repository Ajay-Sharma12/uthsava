import {
  createRoleSchema,
  updateRoleSchema,
} from "../../../../src/modules/admin/validators/role.validator";

describe("Role Validator Unit Tests", () => {
  describe("createRoleSchema", () => {
    it("[Positive] should validate valid role creation data with permissions", () => {
      const { error, value } = createRoleSchema.validate({
        name: "Content Manager",
        description: "Manages platform content and approval workflows",
        status: "active",
        permissions: {
          contents: { view: true, create: true, edit: true, delete: false },
        },
      });
      expect(error).toBeUndefined();
      expect(value.name).toBe("Content Manager");
    });

    it("[Validation] should fail if role name is missing", () => {
      const { error } = createRoleSchema.validate({
        description: "Description without name",
      });
      expect(error).toBeDefined();
    });

    it("[Validation/Edge] should fail if invalid module is provided in permissions map", () => {
      const { error } = createRoleSchema.validate({
        name: "Invalid Role",
        permissions: {
          unsupported_module_key: { view: true },
        },
      });
      expect(error).toBeDefined();
    });
  });

  describe("updateRoleSchema", () => {
    it("[Positive] should validate partial role update", () => {
      const { error } = updateRoleSchema.validate({
        description: "Updated description",
        status: "inactive",
      });
      expect(error).toBeUndefined();
    });
  });
});
