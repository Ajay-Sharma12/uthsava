/// <reference types="jest" />
import { ContentService, ERROR_MESSAGES } from "../../../../src/modules/admin/services/content.service";
import { Content, ContentType, ContentApprovalStatus } from "../../../../src/models/content.model";
import { Season } from "../../../../src/models/season.model";
import { Episode } from "../../../../src/models/episode.model";
import { Types } from "mongoose";

jest.mock("../../../../src/models/content.model");
jest.mock("../../../../src/models/season.model");
jest.mock("../../../../src/models/episode.model");
jest.mock("../../../../src/models/genre.model", () => ({
  Genre: {
    find: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) })
  },
  GenreStatus: { INACTIVE: "INACTIVE" }
}));
jest.mock("../../../../src/models/email-template.model", () => ({
  EmailTemplate: {
    findOne: jest.fn().mockResolvedValue(null)
  }
}));
jest.mock("../../../../src/models/user.model", () => ({
  User: {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    discriminator: jest.fn().mockImplementation(() => ({})),
  },
  UserStatus: { ACTIVE: "active" }
}));
jest.mock("../../../../src/models/language.model", () => ({
  Language: {
    findOne: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: jest.fn().mockResolvedValue({ _id: "507f1f77bcf86cd799439011" })
  }
}));
jest.mock("../../../../src/modules/shared/services/mail.service", () => ({
  sendMail: jest.fn().mockResolvedValue(true)
}));
jest.mock("../../../../src/core/constants/logger", () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}));

const mockContentModel = Content as unknown as jest.Mocked<any>;
const mockSeasonModel = Season as unknown as jest.Mocked<any>;
const mockEpisodeModel = Episode as unknown as jest.Mocked<any>;

describe("ContentService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listContents", () => {
    it("should list contents successfully", async () => {
      const mockContents = [{ _id: "1", type: ContentType.MOVIE, poster: "poster1.jpg" }];
      mockContentModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockContents)
      });
      mockContentModel.countDocuments.mockResolvedValue(1);
      mockContentModel.aggregate.mockResolvedValue([{ totalContent: 1, activeContent: 1, inactiveContent: 0 }]);

      const result = await ContentService.listContents({ page: 1, limit: 10 }, {});

      expect(result.pagination.total).toBe(1);
      expect(result.contents.length).toBe(1);
    });
  });

  describe("getContentById", () => {
    it("should return content if found", async () => {
      const mockContentId = new Types.ObjectId().toString();
      const mockContent = { _id: mockContentId, type: ContentType.MOVIE };
      
      mockContentModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockContent)
      });

      const result = await ContentService.getContentById(mockContentId);

      expect(result._id).toBe(mockContentId);
    });

    it("should throw error if content not found", async () => {
      const mockContentId = new Types.ObjectId().toString();
      
      mockContentModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null)
      });

      await expect(ContentService.getContentById(mockContentId))
        .rejects
        .toThrow(ERROR_MESSAGES.CONTENT_NOT_FOUND);
    });
  });

  describe("createContent", () => {
    it("should create content successfully", async () => {
      const mockData = { title: "Test Content", type: ContentType.MOVIE };
      const savedContent = { _id: "1", ...mockData, populate: jest.fn().mockResolvedValue({ _id: "1", ...mockData }) };
      
      mockContentModel.countDocuments.mockResolvedValue(0);
      mockContentModel.prototype.save = jest.fn().mockResolvedValue(savedContent);
      mockContentModel.prototype.populate = jest.fn().mockResolvedValue(savedContent);

      const result = await ContentService.createContent(mockData);

      expect(result.title).toBe("Test Content");
    });
  });

  describe("updateContent", () => {
    it("should update content successfully", async () => {
      const mockContentId = new Types.ObjectId().toString();
      const updateData = { title: "Updated Content" };
      const existingContent = { _id: mockContentId, title: "Old Title", type: ContentType.MOVIE };
      const updatedContent = { ...existingContent, ...updateData };

      mockContentModel.findById.mockResolvedValue(existingContent);
      mockContentModel.countDocuments.mockResolvedValue(0);
      
      mockContentModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(updatedContent)
      });

      const result = await ContentService.updateContent(mockContentId, updateData);

      expect(result.title).toBe("Updated Content");
    });
  });

  describe("deleteContent", () => {
    it("should delete content successfully", async () => {
      const mockContentId = new Types.ObjectId().toString();
      const existingContent = { _id: mockContentId, type: ContentType.MOVIE };

      mockContentModel.findById.mockResolvedValue(existingContent);
      mockContentModel.findByIdAndDelete = jest.fn().mockResolvedValue(true);

      await ContentService.deleteContent(mockContentId);

      expect(mockContentModel.findById).toHaveBeenCalledWith(mockContentId);
    });
  });

  describe("updateContentStatus", () => {
    it("should update content status successfully", async () => {
      const mockContentId = new Types.ObjectId().toString();
      const updatedContent = { _id: mockContentId, isActive: true };

      mockContentModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(updatedContent)
      });

      const result = await ContentService.updateContentStatus(mockContentId, true);

      expect(result.isActive).toBe(true);
    });
  });
});
