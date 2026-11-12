import { RoleModel } from "../../src/models/role.model";

describe("Role Model Schema Validation", () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with all required fields and valid status", () => {
    const validRole = new RoleModel({
      name: "Content Moderator",
      description: "Manages content approvals and details",
      status: "active",
    });

    const validationError = validRole.validateSync();
    expect(validationError).toBeUndefined();
    expect(validRole.name).toBe("Content Moderator");
  });

  it("[Positive] should initialize default values correctly when not specified", () => {
    const role = new RoleModel({
      name: "Custom Auditor",
    });

    const validationError = role.validateSync();
    expect(validationError).toBeUndefined();
    expect(role.status).toBe("active");
    expect(role.permissions).toBeDefined();
    expect(role.permissions.size).toBe(0); // empty map default
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation if required field 'name' is missing", () => {
    const invalidRole = new RoleModel({
      description: "Role without a name",
      status: "active",
    });

    const validationError = invalidRole.validateSync();
    
    expect(validationError).toBeDefined();
    expect(validationError?.errors["name"]).toBeDefined();
    expect(validationError?.errors["name"].message).toContain("Path `name` is required");
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Validation] should fail validation if status is set to an invalid enum value", () => {
    const invalidRole = new RoleModel({
      name: "Super Administrator",
      status: "pending" as any, // Not one of active/inactive
    });

    const validationError = invalidRole.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["status"]).toBeDefined();
    expect(validationError?.errors["status"].message).toContain("is not a valid enum value");
  });

  it("[Validation] should successfully validate structured permissions if provided in map", () => {
    const permissionsMap = new Map();
    permissionsMap.set("contents", {
      view: true,
      create: false,
      edit: true,
      delete: false,
      all: false,
    });

    const role = new RoleModel({
      name: "Editor",
      permissions: permissionsMap,
    });

    const validationError = role.validateSync();
    expect(validationError).toBeUndefined();
    
    const contentsPermissions = role.permissions.get("contents") as any;
    expect(contentsPermissions).toBeDefined();
    expect(contentsPermissions.view).toBe(true);
    expect(contentsPermissions.create).toBe(false);
  });
});
