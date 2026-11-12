import { Types } from "mongoose";
import { AuditLogService } from "../../../../src/modules/admin/services/audit-log.service";
import { AuditLog, AuditModule, AuditStatus } from "../../../../src/models/audit-log.model";
import { logger } from "../../../../src/core/constants/logger";
import { Request } from "express";

// Mocking models and loggers
jest.mock("../../../../src/models/audit-log.model", () => {
  const original = jest.requireActual("../../../../src/models/audit-log.model");
  return {
    ...original,
    AuditLog: {
      create: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      findById: jest.fn(),
    }
  };
});

jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("Audit Log Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("logAction", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should log action successfully with minimum required parameters", async () => {
      const mockParams = {
        adminId: new Types.ObjectId(),
        module: AuditModule.USERS,
        action: "CREATE_USER",
      };

      (AuditLog.create as jest.Mock).mockResolvedValue(true);

      await AuditLogService.logAction(mockParams);

      expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        adminId: mockParams.adminId,
        module: mockParams.module,
        action: mockParams.action,
        status: AuditStatus.SUCCESS,
        ipAddress: null,
        device: null,
      }));
    });

    it("[Positive] should log action with full details: oldData, newData, entityId, status, failureReason", async () => {
      const mockParams = {
        adminId: new Types.ObjectId(),
        module: AuditModule.SETTINGS,
        action: "UPDATE_SETTINGS",
        entityId: new Types.ObjectId(),
        oldData: { theme: "light" },
        newData: { theme: "dark" },
        status: AuditStatus.SUCCESS,
        failureReason: "",
      };

      (AuditLog.create as jest.Mock).mockResolvedValue(true);

      await AuditLogService.logAction(mockParams);

      expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        adminId: mockParams.adminId,
        module: mockParams.module,
        action: mockParams.action,
        entityId: mockParams.entityId,
        oldData: mockParams.oldData,
        newData: mockParams.newData,
        status: AuditStatus.SUCCESS,
      }));
    });

    it("[Positive] should capture client IP and device user-agent when Express Request is provided", async () => {
      const mockParams = {
        adminId: new Types.ObjectId(),
        module: AuditModule.AUTH,
        action: "LOGIN",
        req: {
          headers: {
            "x-forwarded-for": "192.168.1.100",
            "user-agent": "Mozilla/5.0 Chrome/120.0",
          },
          socket: { remoteAddress: "127.0.0.1" },
          ip: "10.0.0.1",
        } as unknown as Request,
      };

      (AuditLog.create as jest.Mock).mockResolvedValue(true);

      await AuditLogService.logAction(mockParams);

      expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        ipAddress: "192.168.1.100",
        device: "Mozilla/5.0 Chrome/120.0",
      }));
    });

    /* =========================================================================
     * NEGATIVE TEST CASES
     * ========================================================================= */
    it("[Negative] should catch and log error using logger.error if AuditLog.create fails, without throwing", async () => {
      const mockParams = {
        adminId: new Types.ObjectId(),
        module: AuditModule.USERS,
        action: "CREATE_USER",
      };

      const error = new Error("Database offline");
      (AuditLog.create as jest.Mock).mockRejectedValue(error);

      // Verify that calling logAction does not throw an error (failsafe)
      await expect(AuditLogService.logAction(mockParams)).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalledWith("Failed to create audit log", error);
    });

    /* =========================================================================
     * EDGE / VALIDATION TEST CASES
     * ========================================================================= */
    it("[Edge] should handle array of IPs in x-forwarded-for header by selecting the first IP", async () => {
      const mockParams = {
        adminId: new Types.ObjectId(),
        module: AuditModule.AUTH,
        action: "LOGIN",
        req: {
          headers: {
            "x-forwarded-for": ["192.168.1.1", "192.168.1.2"],
          },
          socket: {},
        } as unknown as Request,
      };

      (AuditLog.create as jest.Mock).mockResolvedValue(true);

      await AuditLogService.logAction(mockParams);

      expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        ipAddress: "192.168.1.1",
      }));
    });

    it("[Edge] should fall back to socket.remoteAddress and req.ip when x-forwarded-for header is missing", async () => {
      const mockParams = {
        adminId: new Types.ObjectId(),
        module: AuditModule.AUTH,
        action: "LOGIN",
        req: {
          headers: {},
          socket: { remoteAddress: "127.0.0.1" },
        } as unknown as Request,
      };

      (AuditLog.create as jest.Mock).mockResolvedValue(true);

      await AuditLogService.logAction(mockParams);

      expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        ipAddress: "127.0.0.1",
      }));
    });
  });

  describe("listLogs", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should list paginated logs with custom sorting options", async () => {
      const mockData = [{ _id: "1", action: "test-action" }];
      const mockQuery = { status: AuditStatus.SUCCESS };
      
      const mockFind = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockData),
      };

      (AuditLog.find as jest.Mock).mockReturnValue(mockFind);
      (AuditLog.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await AuditLogService.listLogs(
        { page: 2, limit: 5, sortBy: "action", sortOrder: "asc" },
        mockQuery
      );
      
      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(AuditLog.find).toHaveBeenCalledWith(mockQuery);
      expect(mockFind.sort).toHaveBeenCalledWith({ action: 1 });
      expect(mockFind.skip).toHaveBeenCalledWith(5);
      expect(mockFind.limit).toHaveBeenCalledWith(5);
    });

    /* =========================================================================
     * EDGE / VALIDATION TEST CASES
     * ========================================================================= */
    it("[Edge] should handle page and limit default fallback values if they are undefined", async () => {
      const mockFind = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };

      (AuditLog.find as jest.Mock).mockReturnValue(mockFind);
      (AuditLog.countDocuments as jest.Mock).mockResolvedValue(0);

      await AuditLogService.listLogs({}, {});

      expect(mockFind.skip).toHaveBeenCalledWith(0);
      expect(mockFind.limit).toHaveBeenCalledWith(10);
    });
  });

  describe("getLogById", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should return audit log details by logId", async () => {
      const mockLog = { _id: "1", action: "Action detail" };
      const mockFindById = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockLog),
      };

      (AuditLog.findById as jest.Mock).mockReturnValue(mockFindById);

      const result = await AuditLogService.getLogById("1");
      expect(result).toEqual(mockLog);
      expect(AuditLog.findById).toHaveBeenCalledWith("1");
      expect(mockFindById.populate).toHaveBeenCalledWith("adminId", "firstName lastName email");
    });

    /* =========================================================================
     * NEGATIVE TEST CASES
     * ========================================================================= */
    it("[Negative] should throw error if log ID is not found in database", async () => {
      const mockFindById = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };

      (AuditLog.findById as jest.Mock).mockReturnValue(mockFindById);

      await expect(AuditLogService.getLogById("unknown-id")).rejects.toThrow("error.auditLogNotFound");
    });
  });
});
