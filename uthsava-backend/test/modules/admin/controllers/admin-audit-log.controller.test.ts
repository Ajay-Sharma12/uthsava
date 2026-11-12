import { Request, Response } from "express";
import { listAuditLogs, getAuditLogById } from "../../../../src/modules/admin/controllers/audit-log.controller";
import { AuditLogService } from "../../../../src/modules/admin/services/audit-log.service";
import { ResponseHandler } from "../../../../src/common/responses/response.handler";
import { Types } from "mongoose";

// Mocking dependencies for controller tests
jest.mock("../../../../src/modules/admin/services/audit-log.service");
jest.mock("../../../../src/common/responses/response.handler");
jest.mock("../../../../src/modules/shared/helpers/language.helper", () => ({
  getLanguage: jest.fn().mockReturnValue("en"),
}));
jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe("Admin Audit Log Controller", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe("listAuditLogs", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should list audit logs successfully with default pagination", async () => {
      mockReq = {
        query: {
          page: "1",
          limit: "10",
        },
      };

      const mockResult = {
        data: [{ _id: "1", action: "Test Action" }],
        total: 1,
        totalPages: 1,
      };

      (AuditLogService.listLogs as jest.Mock).mockResolvedValue(mockResult);

      await listAuditLogs(mockReq as Request, mockRes as Response);

      expect(ResponseHandler.success).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          data: mockResult.data,
          filters: expect.any(Object)
        }),
        "auditLog.listed",
        "en"
      );
    });

    it("[Positive] should filter by module, action, adminId, status, and dates successfully", async () => {
      const validAdminId = new Types.ObjectId().toHexString();
      mockReq = {
        query: {
          module: "USERS",
          action: "CREATE",
          adminId: validAdminId,
          status: "SUCCESS",
          fromDate: "2026-01-01",
          toDate: "2026-01-31",
        },
      };

      const mockResult = {
        data: [{ _id: "1", module: "USERS", status: "SUCCESS" }],
        total: 1,
        totalPages: 1,
      };

      (AuditLogService.listLogs as jest.Mock).mockResolvedValue(mockResult);

      await listAuditLogs(mockReq as Request, mockRes as Response);

      expect(AuditLogService.listLogs).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          module: "USERS",
          action: { $regex: "CREATE", $options: "i" },
          adminId: validAdminId,
          status: "SUCCESS",
        })
      );
    });

    /* =========================================================================
     * NEGATIVE TEST CASES
     * ========================================================================= */
    it("[Negative] should return 500 internal server error response when service fails", async () => {
      mockReq = { query: {} };
      const error = new Error("Database connection lost");
      (AuditLogService.listLogs as jest.Mock).mockRejectedValue(error);

      await listAuditLogs(mockReq as Request, mockRes as Response);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        mockRes,
        "general.error",
        "en",
        500,
        error
      );
    });

    /* =========================================================================
     * EDGE / VALIDATION TEST CASES
     * ========================================================================= */
    it("[Edge] should ignore invalid adminId format in search filters without throwing", async () => {
      mockReq = {
        query: {
          adminId: "invalid-id-format",
        },
      };

      (AuditLogService.listLogs as jest.Mock).mockResolvedValue({
        data: [],
        total: 0,
        totalPages: 0,
      });

      await listAuditLogs(mockReq as Request, mockRes as Response);

      // Verify that query object sent to listLogs does NOT contain adminId since it is invalid format
      expect(AuditLogService.listLogs).toHaveBeenCalledWith(
        expect.any(Object),
        expect.not.objectContaining({
          adminId: "invalid-id-format",
        })
      );
    });

    it("[Edge] should list audit logs with empty query parameters successfully", async () => {
      mockReq = { query: {} };

      const mockResult = {
        data: [],
        total: 0,
        totalPages: 0,
      };

      (AuditLogService.listLogs as jest.Mock).mockResolvedValue(mockResult);

      await listAuditLogs(mockReq as Request, mockRes as Response);

      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });

  describe("getAuditLogById", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should get audit log by ID successfully when it exists", async () => {
      const validId = new Types.ObjectId().toHexString();
      mockReq = {
        params: { logId: validId },
      };

      const mockLog = { _id: validId, action: "some-action" };
      (AuditLogService.getLogById as jest.Mock).mockResolvedValue(mockLog);

      await getAuditLogById(mockReq as Request, mockRes as Response);

      expect(ResponseHandler.success).toHaveBeenCalledWith(
        mockRes,
        { log: mockLog },
        "auditLog.retrieved",
        "en"
      );
    });

    /* =========================================================================
     * NEGATIVE TEST CASES
     * ========================================================================= */
    it("[Negative] should return 404 error response if log ID does not exist in database", async () => {
      const validId = new Types.ObjectId().toHexString();
      mockReq = {
        params: { logId: validId },
      };

      const error = new Error("error.auditLogNotFound");
      (AuditLogService.getLogById as jest.Mock).mockRejectedValue(error);

      await getAuditLogById(mockReq as Request, mockRes as Response);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        mockRes,
        "auditLog.not_found",
        "en",
        404
      );
    });

    it("[Negative] should return 500 error response if an unexpected database error occurs", async () => {
      const validId = new Types.ObjectId().toHexString();
      mockReq = {
        params: { logId: validId },
      };

      const error = new Error("Unexpected db error");
      (AuditLogService.getLogById as jest.Mock).mockRejectedValue(error);

      await getAuditLogById(mockReq as Request, mockRes as Response);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        mockRes,
        "general.error",
        "en",
        500,
        error
      );
    });

    /* =========================================================================
     * VALIDATION & EDGE TEST CASES
     * ========================================================================= */
    it("[Validation] should return validation error (422) if logId format is invalid", async () => {
      mockReq = {
        params: { logId: "not-a-valid-object-id" },
      };

      await getAuditLogById(mockReq as Request, mockRes as Response);

      expect(ResponseHandler.validationError).toHaveBeenCalledWith(
        mockRes,
        { logId: "Invalid audit log ID format" },
        "validation.failed",
        "en"
      );
    });

    it("[Edge] should return validation error if logId parameter is empty or missing", async () => {
      mockReq = {
        params: { logId: "" },
      };

      await getAuditLogById(mockReq as Request, mockRes as Response);

      expect(ResponseHandler.validationError).toHaveBeenCalled();
    });
  });
});
