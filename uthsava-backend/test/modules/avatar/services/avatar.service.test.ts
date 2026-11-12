/// <reference types="jest" />
import { Types } from "mongoose";
import { AvatarService } from "../../../../src/modules/avatar/services/avatar.service";
import { Avatar, AvatarStatus } from "../../../../src/models/avatar.model";
import { S3Service } from "../../../../src/modules/shared/services/s3.service";

jest.mock("../../../../src/models/avatar.model", () => {
  const mockAvatarConstructor: any = jest.fn().mockImplementation((data) => ({
    ...data,
    _id: new Types.ObjectId("507f1f77bcf86cd799439011"),
    images: data.images || [],
    save: jest.fn().mockImplementation(function (this: any) {
      return Promise.resolve(this);
    }),
    populate: jest.fn().mockImplementation(function (this: any) {
      return Promise.resolve(this);
    }),
  }));

  mockAvatarConstructor.find = jest.fn();
  mockAvatarConstructor.findOne = jest.fn();
  mockAvatarConstructor.findById = jest.fn();
  mockAvatarConstructor.findByIdAndDelete = jest.fn();
  mockAvatarConstructor.countDocuments = jest.fn();

  return {
    Avatar: mockAvatarConstructor,
    AvatarStatus: {
      ACTIVE: "active",
      INACTIVE: "inactive",
    },
  };
});

jest.mock("../../../../src/modules/shared/services/s3.service", () => ({
  S3Service: {
    deleteFile: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock("../../../../src/core/config", () => ({
  config: {
    aws: {
      cloudFrontUrl: "https://d123.cloudfront.net",
    },
  },
}));

describe("AvatarService Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("resolveMediaUrl", () => {
    it("[Positive] should append CloudFront base URL to relative key", () => {
      const url = AvatarService.resolveMediaUrl("avatars/image1.png");
      expect(url).toBe("https://d123.cloudfront.net/avatars/image1.png");
    });

    it("[Positive] should return HTTP URL unchanged", () => {
      const url = AvatarService.resolveMediaUrl("http://example.com/image.png");
      expect(url).toBe("http://example.com/image.png");
    });

    it("[Edge] should return empty string for null/empty key", () => {
      expect(AvatarService.resolveMediaUrl("")).toBe("");
      expect(AvatarService.resolveMediaUrl(null)).toBe("");
    });
  });

  describe("formatAvatarDoc", () => {
    it("[Positive] should format avatar document correctly with populated createdBy", () => {
      const doc = {
        _id: new Types.ObjectId("507f1f77bcf86cd799439011"),
        category: "Action",
        isKids: true,
        images: ["avatars/pic1.jpg"],
        status: "active",
        createdBy: {
          _id: new Types.ObjectId("507f1f77bcf86cd799439012"),
          fullName: "John Admin",
          email: "admin@example.com",
        },
      };

      const result = AvatarService.formatAvatarDoc(doc);
      expect(result.category).toBe("Action");
      expect(result.isKids).toBe(true);
      expect(result.images[0]).toContain("cloudfront.net");
      expect(result.createdBy.name).toBe("John Admin");
    });
  });

  describe("createAvatar", () => {
    it("[Positive] should create new avatar category when not present", async () => {
      (Avatar.findOne as jest.Mock).mockResolvedValue(null);

      const result = await AvatarService.createAvatar(
        { category: "Anime", isKids: false, images: ["img1.png"] },
        "507f1f77bcf86cd799439011"
      );

      expect(Avatar.findOne).toHaveBeenCalled();
      expect(result.category).toBe("Anime");
    });

    it("[Validation/Negative] should throw error when more than 10 images provided", async () => {
      const tenPlusImages = Array(11).fill("image.png");

      await expect(
        AvatarService.createAvatar({ category: "Test", images: tenPlusImages })
      ).rejects.toThrow("Cannot upload more than 10 avatar images per category");
    });
  });

  describe("listAdminAvatars", () => {
    it("[Positive] should list admin avatars with pagination and filters", async () => {
      const mockDoc = {
        _id: new Types.ObjectId("507f1f77bcf86cd799439011"),
        category: "Comics",
        images: [],
        status: "active",
      };

      const mockQueryHelper = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([mockDoc]),
      };
      (Avatar.find as jest.Mock).mockReturnValue(mockQueryHelper);
      (Avatar.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await AvatarService.listAdminAvatars(
        { page: 1, limit: 10 },
        { search: "Comic", isKids: false, status: AvatarStatus.ACTIVE }
      );

      expect(result.pagination.totalCount).toBe(1);
      expect(result.data[0].category).toBe("Comics");
    });
  });

  describe("getAvatarById", () => {
    it("[Positive] should return avatar doc for valid ObjectId", async () => {
      const validId = "507f1f77bcf86cd799439011";
      const mockDoc = {
        _id: new Types.ObjectId(validId),
        category: "Drama",
        images: [],
      };
      (Avatar.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockDoc),
      });

      const result = await AvatarService.getAvatarById(validId);
      expect(result!.category).toBe("Drama");
    });

    it("[Edge/Validation] should return null for invalid ObjectId or missing document", async () => {
      expect(await AvatarService.getAvatarById("invalid-id")).toBeNull();

      (Avatar.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });
      expect(await AvatarService.getAvatarById("507f1f77bcf86cd799439011")).toBeNull();
    });
  });

  describe("updateAvatar", () => {
    it("[Positive] should update existing avatar category and delete removed S3 images", async () => {
      const validId = "507f1f77bcf86cd799439011";
      const mockAvatarDoc: any = {
        _id: new Types.ObjectId(validId),
        category: "Old",
        images: ["old_image1.png", "keep_image2.png"],
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue(true),
      };
      (Avatar.findById as jest.Mock).mockResolvedValue(mockAvatarDoc);

      const result = await AvatarService.updateAvatar(
        validId,
        { category: "New", images: ["keep_image2.png", "new_image3.png"] },
        "507f1f77bcf86cd799439012"
      );

      expect(S3Service.deleteFile).toHaveBeenCalledWith("old_image1.png");
      expect(mockAvatarDoc.category).toBe("New");
    });

    it("[Validation/Edge] should return null for invalid ObjectId or missing avatar", async () => {
      expect(await AvatarService.updateAvatar("invalid-id", {})).toBeNull();
    });
  });

  describe("updateAvatarStatus", () => {
    it("[Positive] should toggle avatar status", async () => {
      const validId = "507f1f77bcf86cd799439011";
      const mockAvatarDoc: any = {
        _id: new Types.ObjectId(validId),
        status: "active",
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue(true),
      };
      (Avatar.findById as jest.Mock).mockResolvedValue(mockAvatarDoc);

      const result = await AvatarService.updateAvatarStatus(validId, AvatarStatus.INACTIVE);
      expect(mockAvatarDoc.status).toBe(AvatarStatus.INACTIVE);
    });
  });

  describe("deleteAvatar", () => {
    it("[Positive] should delete avatar category and all associated S3 images", async () => {
      const validId = "507f1f77bcf86cd799439011";
      const mockAvatarDoc = {
        _id: new Types.ObjectId(validId),
        images: ["img1.png", "img2.png"],
      };
      (Avatar.findById as jest.Mock).mockResolvedValue(mockAvatarDoc);
      (Avatar.findByIdAndDelete as jest.Mock).mockResolvedValue(true);

      const success = await AvatarService.deleteAvatar(validId);

      expect(S3Service.deleteFile).toHaveBeenCalledTimes(2);
      expect(Avatar.findByIdAndDelete).toHaveBeenCalledWith(validId);
      expect(success).toBe(true);
    });

    it("[Edge/Validation] should return false for invalid ObjectId or missing avatar", async () => {
      expect(await AvatarService.deleteAvatar("invalid-id")).toBe(false);
    });
  });

  describe("getActiveAvatars & listAvatarCategories & createAvatarCategory", () => {
    it("[Positive] should return active avatars list for mobile API", async () => {
      const mockDoc = {
        _id: new Types.ObjectId("507f1f77bcf86cd799439011"),
        category: "Active Category",
        images: ["img.png"],
        status: "active",
      };

      const mockQueryHelper = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockDoc]),
      };
      (Avatar.find as jest.Mock).mockReturnValue(mockQueryHelper);
      (Avatar.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await AvatarService.getActiveAvatars(true, "Active Category", 1, 10);
      expect(result.totalCategories).toBe(1);
      expect(result.categories[0].category).toBe("Active Category");
    });

    it("[Positive] should list distinct avatar categories for dropdown selection", async () => {
      const mockDoc = {
        _id: new Types.ObjectId("507f1f77bcf86cd799439011"),
        category: "Dropdown Category",
        isKids: true,
        status: "active",
      };

      (Avatar.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockResolvedValue([mockDoc]),
      });

      const categories = await AvatarService.listAvatarCategories();
      expect(categories[0].name).toBe("Dropdown Category");
    });

    it("[Validation/Negative] should throw categoryNameIsRequired when name is missing in createAvatarCategory", async () => {
      await expect(AvatarService.createAvatarCategory({ category: "" })).rejects.toThrow(
        "validation.categoryNameIsRequired"
      );
    });
  });
});
