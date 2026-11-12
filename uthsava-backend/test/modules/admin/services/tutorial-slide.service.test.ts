import { Types } from "mongoose";
import { TutorialSlideService } from "../../../../src/modules/admin/services/tutorial-slide.service";
import { TutorialSlide } from "../../../../src/models/tutorial-slide.model";
import { PaginationHelper } from "../../../../src/modules/shared/helpers/pagination.helper";

jest.mock("../../../../src/models/tutorial-slide.model", () => {
  const mockSave = jest.fn().mockResolvedValue(true);
  const mockDeleteOne = jest.fn().mockResolvedValue(true);
  const TutorialSlideMock = jest.fn().mockImplementation((data) => ({
    ...data,
    save: mockSave,
    deleteOne: mockDeleteOne,
  })) as any;
  
  TutorialSlideMock.find = jest.fn(() => ({
    sort: jest.fn().mockResolvedValue([]),
  }));
  TutorialSlideMock.findOne = jest.fn();
  TutorialSlideMock.findById = jest.fn();
  TutorialSlideMock.updateMany = jest.fn();
  TutorialSlideMock.findByIdAndUpdate = jest.fn();
  TutorialSlideMock.countDocuments = jest.fn().mockResolvedValue(5);
  
  return {
    TutorialSlide: TutorialSlideMock,
    SlideStatus: { ACTIVE: "active", INACTIVE: "inactive" },
    SlideMediaType: { IMAGE: "image", VIDEO: "video" },
  };
});

jest.mock("../../../../src/modules/shared/helpers/pagination.helper");

describe("TutorialSlide Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("resolveMediaUrl", () => {
    it("should return empty string if no key", () => {
      expect(TutorialSlideService.resolveMediaUrl("")).toBe("");
    });
    it("should return same url if starts with http", () => {
      expect(TutorialSlideService.resolveMediaUrl("http://example.com/image.png")).toBe("http://example.com/image.png");
    });
    it("should prepend cloudfront url", () => {
      expect(TutorialSlideService.resolveMediaUrl("image.png")).toContain("image.png");
    });
  });

  describe("listSlides", () => {
    it("should list tutorial slides", async () => {
      (PaginationHelper.paginate as jest.Mock).mockResolvedValue({ data: [], total: 0 });

      const result = await TutorialSlideService.listSlides({ page: 1, limit: 10 } as any, { search: "TEST" });
      expect(result).toBeDefined();
      expect(PaginationHelper.paginate).toHaveBeenCalled();
    });
  });

  describe("getSlideById", () => {
    it("should get slide by id", async () => {
      (TutorialSlide.findById as jest.Mock).mockResolvedValue({ _id: "1" });
      const result = await TutorialSlideService.getSlideById("1");
      expect(result).toBeDefined();
    });
  });

  describe("getActiveSlides", () => {
    it("should get active slides", async () => {
      const result = await TutorialSlideService.getActiveSlides();
      expect(result).toEqual([]);
    });
  });

  describe("createSlide", () => {
    it("should create tutorial slide", async () => {
      (TutorialSlide.findOne as jest.Mock).mockResolvedValue(null);
      const mockData = {
        title: "Test",
        description: "Test Desc",
        mediaType: "image" as any,
        sequence: 1,
      };

      const result = await TutorialSlideService.createSlide(mockData);
      expect(result).toBeDefined();
    });

    it("should handle sequence collision", async () => {
      (TutorialSlide.findOne as jest.Mock).mockResolvedValue({ _id: "2" });
      const mockData = {
        title: "Test",
        description: "Test Desc",
        mediaType: "image" as any,
        sequence: 1,
      };

      const result = await TutorialSlideService.createSlide(mockData);
      expect(TutorialSlide.updateMany).toHaveBeenCalled();
    });
  });

  describe("updateSlide", () => {
    it("should update tutorial slide", async () => {
      const mockSlide = { _id: "1", sequence: 1, save: jest.fn().mockResolvedValue(true) };
      (TutorialSlide.findById as jest.Mock).mockResolvedValue(mockSlide);
      (TutorialSlide.findOne as jest.Mock).mockResolvedValue(null);
      
      const result = await TutorialSlideService.updateSlide("1", { title: "Updated" });
      expect(mockSlide.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should handle sequence reposition", async () => {
      const mockSlide = { _id: "1", sequence: 1, save: jest.fn().mockResolvedValue(true) };
      (TutorialSlide.findById as jest.Mock).mockResolvedValue(mockSlide);
      (TutorialSlide.findOne as jest.Mock).mockResolvedValue({ _id: "2" });
      
      await TutorialSlideService.updateSlide("1", { sequence: 2 });
      expect(TutorialSlide.updateMany).toHaveBeenCalled();
    });
  });

  describe("updateSlideStatus", () => {
    it("should update status", async () => {
      (TutorialSlide.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: "1" });
      
      const result = await TutorialSlideService.updateSlideStatus("1", "inactive" as any);
      expect(result).toBeDefined();
    });
  });

  describe("deleteSlide", () => {
    it("should delete slide and re-sequence", async () => {
      const mockSlide = { _id: "1", sequence: 1, deleteOne: jest.fn() };
      (TutorialSlide.findById as jest.Mock).mockResolvedValue(mockSlide);
      
      await TutorialSlideService.deleteSlide("1");
      expect(mockSlide.deleteOne).toHaveBeenCalled();
      expect(TutorialSlide.updateMany).toHaveBeenCalled();
    });
  });
});
