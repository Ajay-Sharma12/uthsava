import { Types } from "mongoose";
import { AwardBadgeService } from "../../../../src/modules/admin/services/award-badge.service";
import { AwardBadge } from "../../../../src/models/award-badge.model";
import { Content } from "../../../../src/models";
import { PaginationHelper } from "../../../../src/modules/shared/helpers/pagination.helper";

jest.mock("../../../../src/models/award-badge.model", () => {
  const mockSave = jest.fn().mockResolvedValue(true);
  const AwardBadgeMock = jest.fn().mockImplementation((data) => ({
    ...data,
    save: mockSave,
  })) as any;
  
  AwardBadgeMock.find = jest.fn();
  AwardBadgeMock.findById = jest.fn(() => ({
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue({ _id: "1" }),
  }));
  
  return {
    AwardBadge: AwardBadgeMock,
    AwardBadgeStatus: { ACTIVE: "active", INACTIVE: "inactive" },
    AwardBadgeType: { AWARD: "award", BADGE: "badge" },
  };
});

jest.mock("../../../../src/models", () => ({
  Content: {
    countDocuments: jest.fn(),
  },
}));

jest.mock("../../../../src/modules/shared/helpers/pagination.helper");

describe("AwardBadge Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listAwardBadges", () => {
    it("should list award badges", async () => {
      (PaginationHelper.paginate as jest.Mock).mockResolvedValue({ data: [], total: 0 });

      const result = await AwardBadgeService.listAwardBadges({ page: 1, limit: 10 } as any, { search: "TEST" });
      expect(result).toBeDefined();
      expect(PaginationHelper.paginate).toHaveBeenCalled();
    });
  });

  describe("getAwardBadgeById", () => {
    it("should get award badge by id", async () => {
      const result = await AwardBadgeService.getAwardBadgeById("1");
      expect(result).toBeDefined();
    });
  });

  describe("createAwardBadge", () => {
    it("should create award badge successfully", async () => {
      const mockData = {
        type: "award" as any,
        name: "Best Actor",
        contentIds: [],
        createdBy: new Types.ObjectId().toHexString(),
      };

      const result = await AwardBadgeService.createAwardBadge(mockData);
      expect(result).toBeDefined();
    });

    it("should throw if invalid content IDs provided", async () => {
      (Content.countDocuments as jest.Mock).mockResolvedValue(0);
      const mockData = {
        type: "award" as any,
        name: "Best Actor",
        contentIds: [new Types.ObjectId().toHexString()],
      };

      await expect(AwardBadgeService.createAwardBadge(mockData)).rejects.toThrow("award_badge.invalid_content_ids");
    });
  });

  describe("updateAwardBadge", () => {
    it("should update award badge", async () => {
      const mockAwardBadge = { _id: "1", type: "award", save: jest.fn().mockResolvedValue(true) };
      (AwardBadge.findById as jest.Mock).mockReturnValue(mockAwardBadge);
      
      const result = await AwardBadgeService.updateAwardBadge("1", { name: "Updated" });
      expect(mockAwardBadge.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe("updateAwardBadgeStatus", () => {
    it("should update status", async () => {
      const mockAwardBadge = { _id: "1", status: "active", save: jest.fn().mockResolvedValue(true) };
      (AwardBadge.findById as jest.Mock).mockReturnValue(mockAwardBadge);
      
      const result = await AwardBadgeService.updateAwardBadgeStatus("1", "inactive" as any);
      expect(mockAwardBadge.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
