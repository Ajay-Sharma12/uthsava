import { Types } from "mongoose";
import { CmsPageService } from "../../../../src/modules/admin/services/cms-page.service";
import { CmsPage, PageStatus } from "../../../../src/models";

jest.mock("../../../../src/models", () => {
  const mockSave = jest.fn().mockResolvedValue(true);
  const CmsPageMock = jest.fn().mockImplementation((data) => ({
    ...data,
    save: mockSave,
    toJSON: () => data,
    slug: data.slug || "test",
  })) as any;
  
  CmsPageMock.findOne = jest.fn();
  CmsPageMock.create = jest.fn();
  CmsPageMock.findById = jest.fn().mockImplementation((id: string) => {
    const mockQuery: any = {
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn(),
      then: (resolve: any, reject: any) => {
        return (CmsPageMock._findByIdResult !== undefined
          ? Promise.resolve(CmsPageMock._findByIdResult)
          : Promise.resolve(null)).then(resolve, reject);
      }
    };
    return mockQuery;
  });
  CmsPageMock.findByIdAndUpdate = jest.fn();
  
  return {
    CmsPage: CmsPageMock,
    PageStatus: {
      ACTIVE: "ACTIVE",
      INACTIVE: "INACTIVE",
      DELETED: "DELETED",
    },
    PublicationStatus: {
      DRAFT: "DRAFT",
      PUBLISHED: "PUBLISHED",
    },
  };
});

jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe("Admin CMS Page Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockToJSON = (obj: any) => ({ ...obj, toJSON: () => obj });

  describe("ensureUniqueSlug", () => {
    it("should return the slug if slug is unique", async () => {
      (CmsPage.findOne as jest.Mock).mockResolvedValue(null);

      const result = await CmsPageService.ensureUniqueSlug("test-slug");
      expect(result).toBe("test-slug");
    });

    it("should return the slug if slug is same as excludeId", async () => {
      const existingId = new Types.ObjectId().toHexString();
      (CmsPage.findOne as jest.Mock).mockResolvedValue(null);

      const result = await CmsPageService.ensureUniqueSlug("test-slug", existingId);
      expect(result).toBe("test-slug");
    });

    it("should return incremented slug if slug exists", async () => {
      (CmsPage.findOne as jest.Mock)
        .mockResolvedValueOnce({ _id: new Types.ObjectId() })
        .mockResolvedValueOnce(null);

      const result = await CmsPageService.ensureUniqueSlug("test-slug");
      expect(result).toBe("test-slug-1");
    });
  });

  describe("createPage", () => {
    it("should create page successfully", async () => {
      const mockPayload = { title: "Test", slug: "test", content: "test content" };
      (CmsPage.findOne as jest.Mock).mockResolvedValue(null); // slug is unique
      
      const result = await CmsPageService.createPage(mockPayload, "admin1");
      expect(result).toMatchObject({ title: "Test", content: "test content" });
    });
  });

  describe("getPageById", () => {
    it("should get page by id", async () => {
      const mockPage = mockToJSON({ _id: "cms1" });
      (CmsPage as any)._findByIdResult = mockPage;

      const result = await CmsPageService.getPageById("cms1");
      expect(result).toEqual({ _id: "cms1" });
    });

    it("should throw not found error", async () => {
      (CmsPage as any)._findByIdResult = null;

      await expect(CmsPageService.getPageById("cms1")).rejects.toThrow("error.pageNotFound");
    });
  });

  describe("getPageBySlug", () => {
    it("should get page by slug", async () => {
      const mockPage = mockToJSON({ _id: "cms1" });
      (CmsPage.findOne as jest.Mock).mockResolvedValue(mockPage);

      const result = await CmsPageService.getPageBySlug("test");
      expect(result).toEqual({ _id: "cms1" });
    });

    it("should throw not found error", async () => {
      (CmsPage.findOne as jest.Mock).mockResolvedValue(null);

      await expect(CmsPageService.getPageBySlug("test")).rejects.toThrow("error.pageNotFound");
    });
  });

  describe("updatePage", () => {
    it("should update page successfully", async () => {
      const mockPage = mockToJSON({ _id: "cms1" });
      (CmsPage.findById as jest.Mock).mockResolvedValue(mockPage);
      (CmsPage.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockPage);

      const result = await CmsPageService.updatePage("cms1", { title: "Updated" }, "admin1");
      expect(CmsPage.findByIdAndUpdate).toHaveBeenCalledWith("cms1", expect.any(Object), { new: true });
      expect(result).toEqual({ _id: "cms1" });
    });

    it("should update page with incremented slug if slug exists on update", async () => {
      const mockPage = mockToJSON({ _id: "cms1" });
      (CmsPage.findById as jest.Mock).mockResolvedValue(mockPage);
      
      (CmsPage.findOne as jest.Mock)
        .mockResolvedValueOnce({ _id: new Types.ObjectId() })
        .mockResolvedValueOnce(null);
        
      (CmsPage.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockToJSON({ ...mockPage, slug: "test-1" }));

      const result = await CmsPageService.updatePage("cms1", { slug: "test" }, "admin1");
      expect(CmsPage.findByIdAndUpdate).toHaveBeenCalledWith("cms1", expect.objectContaining({ $set: expect.objectContaining({ slug: "test-1" }) }), { new: true });
    });
  });

  describe("updatePageStatus", () => {
    it("should update status successfully", async () => {
      const mockPage = mockToJSON({ _id: "cms1" });
      (CmsPage.findById as jest.Mock).mockResolvedValue(mockPage);
      (CmsPage.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockPage);

      const result = await CmsPageService.updatePageStatus("cms1", PageStatus.INACTIVE, "admin1");
      expect(result).toEqual({ _id: "cms1" });
    });

    it("should throw invalid status error", async () => {
      await expect(CmsPageService.updatePageStatus("cms1", "invalid" as any)).rejects.toThrow("error.invalidStatusValue");
    });
  });

  describe("deletePage", () => {
    it("should soft delete page", async () => {
      const mockPage = mockToJSON({ _id: "cms1" });
      (CmsPage.findById as jest.Mock).mockResolvedValue(mockPage);
      (CmsPage.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockPage);

      const result = await CmsPageService.deletePage("cms1", "admin1");
      expect(result).toEqual({ _id: "cms1" });
      expect(CmsPage.findByIdAndUpdate).toHaveBeenCalledWith("cms1", expect.objectContaining({ status: "DELETED" }), { new: true });
    });
  });
});
