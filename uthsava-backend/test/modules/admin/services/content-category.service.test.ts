/// <reference types="jest" />
import { ContentCategoryService, ERROR_MESSAGES } from "../../../../src/modules/admin/services/content-category.service";
import { Genre, type, Content, GenreStatus } from "../../../../src/models";
import { Types } from "mongoose";

jest.mock("../../../../src/models", () => ({
  Genre: {
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    create: jest.fn(),
    prototype: {
      save: jest.fn(),
    }
  },
  Content: {
    aggregate: jest.fn().mockResolvedValue([]),
    countDocuments: jest.fn(),
    findOne: jest.fn()
  },
  GenreStatus: {
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE"
  },
  type: {
    CATEGORY: "category",
    GENRE: "genre",
    LANGUAGE: "language",
    CAST_CREW: "cast_crew"
  }
}));

jest.mock("../../../../src/core/constants/logger", () => ({
  logger: { error: jest.fn(), info: jest.fn() }
}));

const mockGenreModel = Genre as unknown as jest.Mocked<any>;
const mockContentModel = Content as unknown as jest.Mocked<any>;

describe("ContentCategoryService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listActive", () => {
    it("should list active items correctly", async () => {
      mockGenreModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: "1", name: "Action", type: type.CATEGORY }])
      });

      const result = await ContentCategoryService.listActive(type.CATEGORY);

      expect(mockGenreModel.find).toHaveBeenCalledWith({
        status: GenreStatus.ACTIVE,
        type: type.CATEGORY
      });
      expect(result.length).toBe(1);
    });
  });

  describe("getById", () => {
    it("should get item by id", async () => {
      const mockId = new Types.ObjectId();
      const itemObj = { _id: mockId, name: "Action" };
      mockGenreModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(itemObj)
      });

      const result = await ContentCategoryService.getById(mockId.toString());

      expect(result?._id).toBe(mockId);
      expect(mockGenreModel.findById).toHaveBeenCalledWith(mockId.toString());
    });
  });

  describe("create", () => {
    it("should create successfully if name is unique", async () => {
      mockGenreModel.findOne.mockResolvedValue(null);
      const mockData = { name: "Action", type: type.CATEGORY };
      
      const createdObj = {
        _id: new Types.ObjectId(),
        ...mockData,
        populate: jest.fn().mockResolvedValue(true),
        toObject: () => ({ _id: "1", ...mockData })
      };

      mockGenreModel.create.mockResolvedValue(createdObj);

      const result = await ContentCategoryService.create(mockData);

      expect(result.name).toBe("Action");
    });

    it("should throw if name exists", async () => {
      mockGenreModel.findOne.mockResolvedValue({ _id: "2" });

      await expect(ContentCategoryService.create({ name: "Action", type: type.CATEGORY }))
        .rejects
        .toThrow(ERROR_MESSAGES.NAME_EXISTS);
    });
  });

  describe("update", () => {
    it("should update successfully", async () => {
      const mockIdObj = new Types.ObjectId();
      const mockId = mockIdObj.toString();
      mockGenreModel.findOne.mockResolvedValue(null);
      const itemObj = {
        _id: mockIdObj,
        name: "Old",
        type: type.CATEGORY,
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue(true),
        toObject: () => ({ _id: mockId, name: "Updated", type: type.CATEGORY })
      };
      mockGenreModel.findById.mockResolvedValue(itemObj);

      const result = await ContentCategoryService.update(mockId, { name: "Updated" });

      expect(result.name).toBe("Updated");
    });
  });

  describe("delete", () => {
    it("should delete successfully if not mapped", async () => {
      const mockIdObj = new Types.ObjectId();
      const mockId = mockIdObj.toString();
      const itemObj = { _id: mockIdObj, type: type.CATEGORY };
      mockGenreModel.findById.mockResolvedValue(itemObj);
      mockGenreModel.findByIdAndDelete.mockResolvedValue({ _id: mockId });
      mockContentModel.aggregate.mockResolvedValue([]);

      await ContentCategoryService.delete(mockId);

      expect(mockGenreModel.findByIdAndDelete).toHaveBeenCalledWith(mockId);
    });

    it("should throw if mapped to content", async () => {
      const mockIdObj = new Types.ObjectId();
      const mockId = mockIdObj.toString();
      const itemObj = { _id: mockIdObj, type: type.CATEGORY };
      mockGenreModel.findById.mockResolvedValue(itemObj);
      mockContentModel.aggregate.mockResolvedValue([{ _id: mockIdObj, count: 1 }]);

      await expect(ContentCategoryService.delete(mockId))
        .rejects
        .toThrow(ERROR_MESSAGES.MAPPED_TO_CONTENT);
    });
  });

  describe("updateStatus", () => {
    it("should update status successfully", async () => {
      const mockIdObj = new Types.ObjectId();
      const mockId = mockIdObj.toString();
      const itemObj = {
        _id: mockIdObj,
        status: GenreStatus.INACTIVE,
        type: type.CATEGORY,
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue(true),
        toObject: () => ({ _id: mockId, status: GenreStatus.ACTIVE, type: type.CATEGORY })
      };
      mockGenreModel.findById.mockResolvedValue(itemObj);

      const result = await ContentCategoryService.updateStatus(mockId, GenreStatus.ACTIVE);

      expect(result.status).toBe(GenreStatus.ACTIVE);
    });
  });

  describe("updateDisplayOrder", () => {
    it("should update display order successfully", async () => {
      const mockIdObj = new Types.ObjectId();
      const mockId = mockIdObj.toString();
      const itemObj = {
        _id: mockIdObj,
        displayOrder: 1,
        type: type.CATEGORY,
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue(true),
        toObject: () => ({ _id: mockId, displayOrder: 5, type: type.CATEGORY })
      };
      mockGenreModel.findById.mockResolvedValue(itemObj);

      const result = await ContentCategoryService.updateDisplayOrder(mockId, 5);

      expect(result.displayOrder).toBe(5);
    });
  });
});
