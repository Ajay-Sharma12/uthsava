import mongoose from "mongoose";
import { SubAdminActivity } from "../../src/models/subadmin-activity.model";

describe("SubAdminActivity Model Schema Validation", () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with all required fields", () => {
    const activity = new SubAdminActivity({
      subAdminId: new mongoose.Types.ObjectId(),
      module: "Content",
      action: "create",
      method: "POST",
      path: "/api/v1/admin/contents",
      statusCode: 201,
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0",
    });

    const validationError = activity.validateSync();
    expect(validationError).toBeUndefined();
    expect(activity.action).toBe("create");
    expect(activity.method).toBe("POST");
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation if required fields are missing", () => {
    const activity = new SubAdminActivity({});

    const validationError = activity.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["subAdminId"]).toBeDefined();
    expect(validationError?.errors["module"]).toBeDefined();
    expect(validationError?.errors["action"]).toBeDefined();
    expect(validationError?.errors["method"]).toBeDefined();
    expect(validationError?.errors["path"]).toBeDefined();
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Validation] should fail validation if action is set to an invalid value", () => {
    const activity = new SubAdminActivity({
      subAdminId: new mongoose.Types.ObjectId(),
      module: "Content",
      action: "download" as any, // Not view/create/edit/delete
      method: "GET",
      path: "/api/v1/admin/contents/download",
    });

    const validationError = activity.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["action"]).toBeDefined();
    expect(validationError?.errors["action"].message).toContain("is not a valid enum value");
  });
});
