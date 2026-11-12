/// <reference types="jest" />
import { ContentApprovalService } from "../../../../src/modules/admin/services/content-approval.service";
import { Content, ContentApprovalStatus, ContentStatus } from "../../../../src/models/content.model";
import { Genre } from "../../../../src/models/genre.model";
import { Types } from "mongoose";

jest.mock("../../../../src/models/content.model");
jest.mock("../../../../src/models/genre.model");

jest.mock("../../../../src/core/constants/logger", () => ({
  logger: { error: jest.fn(), info: jest.fn() }
}));

const mockContentModel = Content as unknown as jest.Mocked<any>;
const mockGenreModel = Genre as unknown as jest.Mocked<any>;

describe("ContentApprovalService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPendingApprovals", () => {
    it("should get pending approvals", async () => {
      mockContentModel.aggregate.mockResolvedValue([{ _id: "1", total: 1 }]);

      const result = await ContentApprovalService.getPendingApprovals(1, 10, { search: "test" });

      expect(mockContentModel.aggregate).toHaveBeenCalled();
      expect(result.pagination.total).toBe(1);
    });
  });

  describe("getContentForApproval", () => {
    it("should get content and update review count", async () => {
      const mockId = new Types.ObjectId().toString();
      mockContentModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ _id: mockId, title: "Movie" })
      });
      mockContentModel.findByIdAndUpdate.mockResolvedValue({});

      const result = await ContentApprovalService.getContentForApproval(mockId);

      expect(result._id).toBe(mockId);
      expect(mockContentModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it("should throw if not found", async () => {
      mockContentModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null)
      });

      await expect(ContentApprovalService.getContentForApproval("1")).rejects.toThrow("error.contentNotFound");
    });
  });

  describe("approveContent", () => {
    it("should approve content", async () => {
      const mockId = new Types.ObjectId().toString();
      mockContentModel.findById.mockResolvedValue({ _id: mockId, approvalStatus: ContentApprovalStatus.PENDING });
      mockContentModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ _id: mockId, approvalStatus: ContentApprovalStatus.APPROVED })
      });

      const result = await ContentApprovalService.approveContent(mockId, "admin1", "ADULTS", "notes");

      expect(result?.approvalStatus).toBe(ContentApprovalStatus.APPROVED);
      expect(mockContentModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it("should throw if already approved", async () => {
      mockContentModel.findById.mockResolvedValue({ _id: "1", approvalStatus: ContentApprovalStatus.APPROVED });

      await expect(ContentApprovalService.approveContent("1", "admin1")).rejects.toThrow("error.contentIsAlreadyApproved");
    });
  });

  describe("rejectContent", () => {
    it("should reject content", async () => {
      const mockId = new Types.ObjectId().toString();
      mockContentModel.findById.mockResolvedValue({ _id: mockId, status: ContentStatus.ACTIVE });
      mockContentModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ _id: mockId, rejectionReason: "Bad content" })
      });

      const result = await ContentApprovalService.rejectContent(mockId, "admin1", "Bad content");

      expect(result?.rejectionReason).toBe("Bad content");
      expect(mockContentModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it("should throw if rejection reason is missing", async () => {
      await expect(ContentApprovalService.rejectContent("1", "admin1", "")).rejects.toThrow("Rejection reason is required");
    });

    it("should throw if content is inactive", async () => {
      mockContentModel.findById.mockResolvedValue({ _id: "1", status: ContentStatus.INACTIVE });

      await expect(ContentApprovalService.rejectContent("1", "admin1", "Reason long enough")).rejects.toThrow("error.cannotRejectInactiveContent");
    });
  });

  describe("getApprovalSummary", () => {
    it("should return summary", async () => {
      mockContentModel.countDocuments
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5)  // pending
        .mockResolvedValueOnce(3)  // approved
        .mockResolvedValueOnce(2); // rejected

      const result = await ContentApprovalService.getApprovalSummary();

      expect(result.total).toBe(10);
      expect(result.pending).toBe(5);
      expect(result.approved).toBe(3);
      expect(result.rejected).toBe(2);
      expect(result.approvalRate).toBe(30);
    });
  });

  describe("getApprovalStats", () => {
    it("should return stats", async () => {
      mockContentModel.aggregate.mockResolvedValue([{ _id: "2023-10-10", approved: 5, rejected: 2, pending: 3 }]);

      const result = await ContentApprovalService.getApprovalStats();

      expect(result.length).toBe(1);
      expect(result[0].date).toBe("2023-10-10");
    });
  });
});
