/// <reference types="jest" />
import { Request, Response } from "express";
import { getDashboardStats } from "../../../../src/modules/admin/controllers/dashboard.controller";
import { DashboardService } from "../../../../src/modules/admin/services/dashboard.service";
import { ResponseHandler } from "../../../../src/common/responses/response.handler";

jest.mock("../../../../src/modules/admin/services/dashboard.service");
jest.mock("../../../../src/common/responses/response.handler");
jest.mock("../../../../src/modules/shared/helpers/language.helper", () => ({
  getLanguage: jest.fn().mockReturnValue("en"),
}));
jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (query: any = {}) => {
  return {
    query,
  } as unknown as Request;
};

describe("Admin Dashboard Controller API Tests", () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
  });

  describe("getDashboardStats", () => {
    it("should return dashboard stats successfully without dates", async () => {
      req = mockRequest({});
      const mockStats = { users: { totalUsers: 100 } };
      (DashboardService.getDashboardStats as jest.Mock).mockResolvedValue(mockStats);

      await getDashboardStats(req, res);

      expect(DashboardService.getDashboardStats).toHaveBeenCalledWith(undefined, undefined);
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockStats,
        "Dashboard statistics retrieved successfully",
        "en"
      );
    });

    it("should handle fromDate and toDate correctly", async () => {
      req = mockRequest({ fromDate: "2023-01-01", toDate: "2023-12-31" });
      const mockStats = { users: { totalUsers: 50 } };
      (DashboardService.getDashboardStats as jest.Mock).mockResolvedValue(mockStats);

      await getDashboardStats(req, res);

      expect(DashboardService.getDashboardStats).toHaveBeenCalledWith("2023-01-01", "2023-12-31");
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should convert DD/MM/YYYY to YYYY-MM-DD", async () => {
      req = mockRequest({ fromDate: "01/05/2023", toDate: "31/12/2023" });
      (DashboardService.getDashboardStats as jest.Mock).mockResolvedValue({});

      await getDashboardStats(req, res);

      expect(DashboardService.getDashboardStats).toHaveBeenCalledWith("2023-05-01", "2023-12-31");
    });

    it("should return bad request if date format is invalid", async () => {
      req = mockRequest({ fromDate: "invalid-date" });

      await getDashboardStats(req, res);

      expect(ResponseHandler.badRequest).toHaveBeenCalledWith(
        res,
        "error.invalidFromdateFormatUseDdmmyyyyOrYyyymmdd",
        "en"
      );
    });

    it("should return bad request if fromDate > toDate", async () => {
      req = mockRequest({ fromDate: "2023-12-31", toDate: "2023-01-01" });

      await getDashboardStats(req, res);

      expect(ResponseHandler.badRequest).toHaveBeenCalledWith(
        res,
        "error.fromdateCannotBeAfterTodate",
        "en"
      );
    });

    it("should handle service errors", async () => {
      req = mockRequest({});
      (DashboardService.getDashboardStats as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await getDashboardStats(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "general.error",
        "en",
        500,
        expect.any(Error)
      );
    });
  });
});

