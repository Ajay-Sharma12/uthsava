import { AuditLog, AuditModule, AuditStatus } from "../../src/models/audit-log.model";
import { Types } from "mongoose";

describe("Audit Log Model Schema Validation", () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with all required fields and valid data", () => {
    const validLog = new AuditLog({
      adminId: new Types.ObjectId(),
      module: AuditModule.USERS,
      action: "Create User",
      status: AuditStatus.SUCCESS,
    });

    const validationError = validLog.validateSync();
    expect(validationError).toBeUndefined();
  });

  it("[Positive] should initialize default values correctly when not specified", () => {
    const log = new AuditLog({
      adminId: new Types.ObjectId(),
      module: AuditModule.GENRES,
      action: "Delete Genre",
    });

    expect(log.status).toBe(AuditStatus.SUCCESS);
    expect(log.entityId).toBeNull();
    expect(log.oldData).toBeNull();
    expect(log.newData).toBeNull();
    expect(log.ipAddress).toBeNull();
    expect(log.device).toBeNull();
    expect(log.failureReason).toBeNull();
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation if required fields (adminId, module, action) are missing", () => {
    const invalidLog = new AuditLog({});
    const validationError = invalidLog.validateSync();
    
    expect(validationError).toBeDefined();
    expect(validationError?.errors["adminId"]).toBeDefined();
    expect(validationError?.errors["module"]).toBeDefined();
    expect(validationError?.errors["action"]).toBeDefined();
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Validation] should fail validation if module has an invalid enum value", () => {
    const invalidLog = new AuditLog({
      adminId: new Types.ObjectId(),
      module: "INVALID_MODULE" as any,
      action: "Invalid Action",
    });

    const validationError = invalidLog.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["module"]).toBeDefined();
    expect(validationError?.errors["module"].message).toContain("is not a valid enum value");
  });

  it("[Validation] should fail validation if status has an invalid enum value", () => {
    const invalidLog = new AuditLog({
      adminId: new Types.ObjectId(),
      module: AuditModule.SETTINGS,
      action: "Update settings",
      status: "INVALID_STATUS" as any,
    });

    const validationError = invalidLog.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors["status"]).toBeDefined();
    expect(validationError?.errors["status"].message).toContain("is not a valid enum value");
  });
});
