import { Types } from "mongoose";
import { SubAdminActivityHelper } from "../../../../src/modules/shared/helpers/subadmin-activity.helper";
import { SubAdminActivity } from "../../../../src/models/subadmin-activity.model";
import { Role } from "../../../../src/common/types/auth.types";
import { logger } from "../../../../src/core/constants/logger";

jest.mock("../../../../src/models/subadmin-activity.model", () => {
  return {
    SubAdminActivity: jest.fn().mockImplementation(function (this: any, data: any) {
      Object.assign(this, data);
      this.save = jest.fn().mockResolvedValue(this);
    }),
  };
});

jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe("SubAdminActivityHelper Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* =========================================================================
   * httpMethodToAction TESTS
   * ========================================================================= */
  describe("httpMethodToAction", () => {
    it("[Positive] should correctly map HTTP methods to activity actions", () => {
      expect(SubAdminActivityHelper.httpMethodToAction("GET")).toBe("view");
      expect(SubAdminActivityHelper.httpMethodToAction("POST")).toBe("create");
      expect(SubAdminActivityHelper.httpMethodToAction("PUT")).toBe("edit");
      expect(SubAdminActivityHelper.httpMethodToAction("PATCH")).toBe("edit");
      expect(SubAdminActivityHelper.httpMethodToAction("DELETE")).toBe("delete");
    });

    it("[Positive] should handle lowercase method strings", () => {
      expect(SubAdminActivityHelper.httpMethodToAction("post")).toBe("create");
    });

    it("[Edge] should default to 'view' when method is unrecognized or empty", () => {
      expect(SubAdminActivityHelper.httpMethodToAction("HEAD")).toBe("view");
      expect(SubAdminActivityHelper.httpMethodToAction("")).toBe("view");
    });
  });

  /* =========================================================================
   * logActivity TESTS
   * ========================================================================= */
  describe("logActivity", () => {
    const validOptions = {
      subAdminId: "60c72b2f9b1d8a25c88c9f12",
      role: Role.ADMIN_SUB_USER,
      module: "Content",
      action: "create" as const,
      method: "POST",
      path: "/api/v1/admin/contents",
      statusCode: 201,
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0",
    };

    it("[Positive] should successfully log sub-admin activity and return saved document", async () => {
      const result = await SubAdminActivityHelper.logActivity(validOptions);

      expect(SubAdminActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          subAdminId: new Types.ObjectId(validOptions.subAdminId),
          module: "Content",
          action: "create",
          method: "POST",
          path: "/api/v1/admin/contents",
          statusCode: 201,
          ipAddress: "127.0.0.1",
          userAgent: "Mozilla/5.0",
        })
      );
      expect(result).toBeDefined();
      expect(result?.save).toHaveBeenCalled();
    });

    it("[Positive] should return null and skip logging if user role is not ADMIN_SUB_USER", async () => {
      const options = { ...validOptions, role: Role.ADMIN };
      const result = await SubAdminActivityHelper.logActivity(options);

      expect(result).toBeNull();
      expect(SubAdminActivity).not.toHaveBeenCalled();
    });

    it("[Negative] should catch exceptions in database save, log error and return null", async () => {
      const dbError = new Error("Database write error");
      (SubAdminActivity as unknown as jest.Mock).mockImplementationOnce(function (this: any, data: any) {
        Object.assign(this, data);
        this.save = jest.fn().mockRejectedValue(dbError);
      });

      const result = await SubAdminActivityHelper.logActivity(validOptions);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        "[SubAdminActivityHelper] Failed to log activity:",
        expect.objectContaining({ error: dbError, options: validOptions })
      );
    });
  });
});
