import { Request, Response } from "express";
import { createAwardBadge, listAwardBadges, getAwardBadgeById, updateAwardBadge, updateAwardBadgeStatus } from "../../../../src/modules/admin/controllers/award-badge.controller";
import { AwardBadgeService } from "../../../../src/modules/admin/services/award-badge.service";
import { PaginationHelper } from "../../../../src/modules/shared/helpers/pagination.helper";
import { ResponseHandler } from "../../../../src/common/responses/response.handler";
import { Types } from "mongoose";

jest.mock("../../../../src/modules/admin/services/award-badge.service");
jest.mock("../../../../src/common/responses/response.handler");
jest.mock("../../../../src/modules/shared/helpers/pagination.helper");
jest.mock("../../../../src/modules/shared/helpers/language.helper", () => ({
  getLanguage: jest.fn().mockReturnValue("en"),
}));
jest.mock("../../../../src/core/constants/logger", () => ({
  logger: { error: jest.fn() },
}));

describe("Admin AwardBadge Controller", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe("listAwardBadges", () => {
    it("should list award badges", async () => {
      mockReq = { query: {} };
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue({});
      (AwardBadgeService.listAwardBadges as jest.Mock).mockResolvedValue({ data: [], total: 0 });

      await listAwardBadges(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });

  describe("getAwardBadgeById", () => {
    it("should get award badge", async () => {
      mockReq = { params: { awardBadgeId: "1" } };
      (AwardBadgeService.getAwardBadgeById as jest.Mock).mockResolvedValue({ _id: "1" });

      await getAwardBadgeById(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });

  describe("createAwardBadge", () => {
    it("should create award badge", async () => {
      mockReq = { 
        body: { type: "award", name: "TEST" }, 
        user: { sub: new Types.ObjectId().toHexString() } as any 
      };
      (AwardBadgeService.createAwardBadge as jest.Mock).mockResolvedValue({ _id: "1" });

      await createAwardBadge(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });

  describe("updateAwardBadge", () => {
    it("should update award badge", async () => {
      mockReq = { params: { awardBadgeId: "1" }, body: {} };
      (AwardBadgeService.updateAwardBadge as jest.Mock).mockResolvedValue({ _id: "1" });

      await updateAwardBadge(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });

  describe("updateAwardBadgeStatus", () => {
    it("should update status", async () => {
      mockReq = { params: { awardBadgeId: "1" }, body: { status: "active" } };
      (AwardBadgeService.updateAwardBadgeStatus as jest.Mock).mockResolvedValue({ _id: "1" });

      await updateAwardBadgeStatus(mockReq as Request, mockRes as Response);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });
});
