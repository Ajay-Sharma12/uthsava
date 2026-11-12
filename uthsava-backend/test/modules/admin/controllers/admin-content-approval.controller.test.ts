/// <reference types="jest" />
import { Request, Response } from "express";
import {
  listPendingApprovals,
  getContentForApproval,
  approveContent,
  rejectContent,
  getApprovalSummary,
  getApprovalStats
} from "../../../../src/modules/admin/controllers/content-approval.controller";
import { ContentApprovalService } from "../../../../src/modules/admin/services/content-approval.service";
import { ResponseHandler } from "../../../../src/common/responses/response.handler";
import { HTTP_STATUS } from "../../../../src/core/constants/app.constants";
import { ContentApprovalStatus } from "../../../../src/models/content.model";

jest.mock("../../../../src/modules/admin/services/content-approval.service");
jest.mock("../../../../src/common/responses/response.handler");
jest.mock("../../../../src/modules/shared/helpers/language.helper", () => ({
  getLanguage: jest.fn().mockReturnValue("en"),
}));
jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));
jest.mock("../../../../src/models/email-template.model", () => ({
  EmailTemplate: {
    findOne: jest.fn().mockResolvedValue({ description: "Test", subject: "Test" }),
  },
}));
jest.mock("../../../../src/modules/shared/services/mail.service", () => ({
  sendMail: jest.fn().mockResolvedValue(true),
}));

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (query: any = {}, params: any = {}, body: any = {}, user: any = undefined) => {
  return {
    query,
    params,
    body,
    user,
  } as unknown as Request;
};

describe("Content Approval Controller API Tests", () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
  });

  describe("listPendingApprovals", () => {
    it("should list pending approvals successfully", async () => {
      req = mockRequest({ page: "1", limit: "10" });
      const mockResult = {
        data: [{ _id: "1", title: "Movie", uploaderInfo: [{ fullName: "John" }] }],
        pagination: { total: 1, pages: 1 }
      };
      (ContentApprovalService.getPendingApprovals as jest.Mock).mockResolvedValue(mockResult);

      await listPendingApprovals(req as any, res);

      expect(ContentApprovalService.getPendingApprovals).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });

  describe("getContentForApproval", () => {
    it("should return approval details successfully", async () => {
      req = mockRequest({}, { contentId: "1" });
      const mockDetails = { _id: "1", title: "Movie" };
      (ContentApprovalService.getContentForApproval as jest.Mock).mockResolvedValue(mockDetails);

      await getContentForApproval(req as any, res);

      expect(ContentApprovalService.getContentForApproval).toHaveBeenCalledWith("1");
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle error when details not found", async () => {
      req = mockRequest({}, { contentId: "1" });
      (ContentApprovalService.getContentForApproval as jest.Mock).mockRejectedValue(new Error("error.contentNotFound"));

      await getContentForApproval(req as any, res);

      expect(ResponseHandler.notFound).toHaveBeenCalled();
    });
  });

  describe("approveContent", () => {
    it("should approve content successfully", async () => {
      req = mockRequest({}, { contentId: "1" }, { ageCategory: "ADULTS", approvalNotes: "ok" }, { sub: "admin1" });
      const mockItem = { _id: "1", title: "Movie", uploadedBy: { email: "user@test.com", fullName: "User" } };
      (ContentApprovalService.approveContent as jest.Mock).mockResolvedValue(mockItem);

      await approveContent(req as any, res);

      expect(ContentApprovalService.approveContent).toHaveBeenCalledWith("1", "admin1", "ADULTS", "ok");
      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });

  describe("rejectContent", () => {
    it("should reject content successfully", async () => {
      req = mockRequest({}, { contentId: "1" }, { rejectionReason: "Bad content" }, { sub: "admin1" });
      const mockItem = { _id: "1", title: "Movie", uploadedBy: { email: "user@test.com", fullName: "User" } };
      (ContentApprovalService.rejectContent as jest.Mock).mockResolvedValue(mockItem);
      
      await rejectContent(req as any, res);

      expect(ContentApprovalService.rejectContent).toHaveBeenCalledWith("1", "admin1", "Bad content");
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should validate rejection reason", async () => {
      req = mockRequest({}, { contentId: "1" }, { rejectionReason: "no" }, { sub: "admin1" });
      
      await rejectContent(req as any, res);

      expect(ResponseHandler.validationError).toHaveBeenCalled();
    });
  });

  describe("getApprovalSummary", () => {
    it("should return summary", async () => {
      req = mockRequest();
      (ContentApprovalService.getApprovalSummary as jest.Mock).mockResolvedValue({ total: 10 });
      await getApprovalSummary(req as any, res);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });

  describe("getApprovalStats", () => {
    it("should return stats", async () => {
      req = mockRequest();
      (ContentApprovalService.getApprovalStats as jest.Mock).mockResolvedValue([]);
      await getApprovalStats(req as any, res);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });
});
