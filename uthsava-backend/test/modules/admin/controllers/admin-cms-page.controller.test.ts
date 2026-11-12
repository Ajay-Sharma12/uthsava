import { Request, Response } from "express";
import {
  createCmsPage,
  listCmsPages,
  getCmsPageById,
  getCmsPageBySlug,
  updateCmsPage,
  updateCmsPageStatus,
  deleteCmsPage,
  getPublicStaticPage,
} from "../../../../src/modules/admin/controllers/cms-page.controller";
import { CmsPageService } from "../../../../src/modules/admin/services/cms-page.service";
import { ResponseHandler } from "../../../../src/common/responses/response.handler";
import { PaginationHelper } from "../../../../src/modules/shared/helpers/pagination.helper";
import { HTTP_STATUS } from "../../../../src/core/constants/app.constants";

jest.mock("../../../../src/modules/admin/services/cms-page.service");
jest.mock("../../../../src/common/responses/response.handler");
jest.mock("../../../../src/modules/shared/helpers/pagination.helper");
jest.mock("../../../../src/modules/shared/helpers/language.helper", () => ({
  getLanguage: jest.fn().mockReturnValue("en"),
}));
jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));
jest.mock("../../../../src/modules/shared/helpers/subadmin-activity.helper", () => ({
  SubAdminActivityHelper: {
    logActivity: jest.fn().mockResolvedValue(true),
  },
}));

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (query: any = {}, params: any = {}, body: any = {}, user: any = { sub: "60c72b2f9b1d8b001c8e4b5a", role: "admin" }) => {
  return {
    query,
    params,
    body,
    user,
    headers: {
      "x-forwarded-for": "127.0.0.1",
      "user-agent": "test-agent",
    },
    originalUrl: "/api/v1/test",
    method: "GET",
  } as unknown as Request;
};

describe("Admin CMS Page Controller", () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
  });

  describe("createCmsPage", () => {
    it("should create CMS page successfully", async () => {
      req = mockRequest({}, {}, { title: "Test", content: "Test content", slug: "test" });
      const mockResult = { _id: "cms1" };
      (CmsPageService.createPage as jest.Mock).mockResolvedValue(mockResult);

      await createCmsPage(req as any, res);

      expect(CmsPageService.createPage).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockResult,
        "cms.pageCreated",
        "en",
        HTTP_STATUS.CREATED
      );
    });

    it("should handle error", async () => {
      req = mockRequest({}, {}, { title: "Test", content: "Test content", slug: "test" });
      (CmsPageService.createPage as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await createCmsPage(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("listCmsPages", () => {
    it("should return CMS pages", async () => {
      req = mockRequest({ search: "Test", status: "all" });
      const mockResult = { data: [], pagination: { page: 1, limit: 10, totalPages: 0, total: 0 } };
      const mockPaginationParams = { sortBy: "createdAt", sortOrder: "desc" };
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue(mockPaginationParams);
      (PaginationHelper.paginate as jest.Mock).mockResolvedValue(mockResult);

      await listCmsPages(req as any, res);

      expect(PaginationHelper.paginate).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { ...mockResult, filters: { search: "Test", status: "all", startDate: null, endDate: null, sortBy: "createdAt", sortOrder: "desc" } },
        "general.success",
        "en"
      );
    });

    it("should handle error", async () => {
      req = mockRequest();
      (PaginationHelper.paginate as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await listCmsPages(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("getCmsPageById", () => {
    it("should return CMS page by id", async () => {
      req = mockRequest({}, { pageId: "cms1" });
      const mockResult = { _id: "cms1", createdBy: null, updatedBy: null };
      (CmsPageService.getPageById as jest.Mock).mockResolvedValue(mockResult);

      await getCmsPageById(req as any, res);

      expect(CmsPageService.getPageById).toHaveBeenCalledWith("cms1");
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockResult,
        "general.success",
        "en"
      );
    });

    it("should return not found", async () => {
      req = mockRequest({}, { pageId: "cms1" });
      (CmsPageService.getPageById as jest.Mock).mockRejectedValue(new Error("error.pageNotFound"));

      await getCmsPageById(req as any, res);

      expect(ResponseHandler.notFound).toHaveBeenCalledWith(
        res,
        "cms.pageNotFound",
        "en"
      );
    });

    it("should handle error", async () => {
      req = mockRequest({}, { pageId: "cms1" });
      (CmsPageService.getPageById as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await getCmsPageById(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("getCmsPageBySlug", () => {
    it("should return CMS page by slug", async () => {
      req = mockRequest({}, { slug: "test" });
      const mockResult = { _id: "cms1" };
      (CmsPageService.getPageBySlug as jest.Mock).mockResolvedValue(mockResult);

      await getCmsPageBySlug(req as any, res);

      expect(CmsPageService.getPageBySlug).toHaveBeenCalledWith("test");
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockResult,
        "general.success",
        "en"
      );
    });

    it("should return not found", async () => {
      req = mockRequest({}, { slug: "test" });
      (CmsPageService.getPageBySlug as jest.Mock).mockRejectedValue(new Error("error.pageNotFound"));

      await getCmsPageBySlug(req as any, res);

      expect(ResponseHandler.notFound).toHaveBeenCalledWith(
        res,
        "cms.pageNotFound",
        "en"
      );
    });

    it("should handle error", async () => {
      req = mockRequest({}, { slug: "test" });
      (CmsPageService.getPageBySlug as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await getCmsPageBySlug(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("updateCmsPage", () => {
    it("should update CMS page successfully", async () => {
      req = mockRequest({}, { pageId: "cms1" }, { title: "Test updated" });
      const mockResult = { _id: "cms1" };
      (CmsPageService.updatePage as jest.Mock).mockResolvedValue(mockResult);

      await updateCmsPage(req as any, res);

      expect(CmsPageService.updatePage).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockResult,
        "cms.pageUpdated",
        "en"
      );
    });

    it("should handle not found", async () => {
      req = mockRequest({}, { pageId: "cms1" }, { title: "Test updated" });
      (CmsPageService.updatePage as jest.Mock).mockRejectedValue(new Error("error.pageNotFound"));

      await updateCmsPage(req as any, res);

      expect(ResponseHandler.notFound).toHaveBeenCalledWith(
        res,
        "cms.pageNotFound",
        "en"
      );
    });

    it("should handle error", async () => {
      req = mockRequest({}, { pageId: "cms1" }, { title: "Test updated" });
      (CmsPageService.updatePage as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await updateCmsPage(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("updateCmsPageStatus", () => {
    it("should update status successfully", async () => {
      req = mockRequest({}, { pageId: "cms1" }, { status: "inactive" });
      const mockResult = { _id: "cms1" };
      (CmsPageService.updatePageStatus as jest.Mock).mockResolvedValue(mockResult);

      await updateCmsPageStatus(req as any, res);

      expect(CmsPageService.updatePageStatus).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockResult,
        "cms.pageStatusUpdated",
        "en"
      );
    });

    it("should handle not found", async () => {
      req = mockRequest({}, { pageId: "cms1" }, { status: "inactive" });
      (CmsPageService.updatePageStatus as jest.Mock).mockRejectedValue(new Error("error.pageNotFound"));

      await updateCmsPageStatus(req as any, res);

      expect(ResponseHandler.notFound).toHaveBeenCalledWith(
        res,
        "cms.pageNotFound",
        "en"
      );
    });

    it("should handle error", async () => {
      req = mockRequest({}, { pageId: "cms1" }, { status: "inactive" });
      (CmsPageService.updatePageStatus as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await updateCmsPageStatus(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("deleteCmsPage", () => {
    it("should delete successfully", async () => {
      req = mockRequest({}, { pageId: "cms1" });
      (CmsPageService.deletePage as jest.Mock).mockResolvedValue(true);

      await deleteCmsPage(req as any, res);

      expect(CmsPageService.deletePage).toHaveBeenCalledWith("cms1", expect.any(String));
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        true,
        "cms.pageDeleted",
        "en"
      );
    });

    it("should handle not found error", async () => {
      req = mockRequest({}, { pageId: "cms1" });
      (CmsPageService.deletePage as jest.Mock).mockRejectedValue(new Error("error.pageNotFound"));

      await deleteCmsPage(req as any, res);

      expect(ResponseHandler.notFound).toHaveBeenCalledWith(
        res,
        "cms.pageNotFound",
        "en"
      );
    });

    it("should handle error", async () => {
      req = mockRequest({}, { pageId: "cms1" });
      (CmsPageService.deletePage as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await deleteCmsPage(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("getPublicStaticPage", () => {
    it("should get public static page", async () => {
      req = mockRequest({ slug: "test" });
      const mockResult = { _id: "cms1" };
      (CmsPageService.getPageBySlug as jest.Mock).mockResolvedValue(mockResult);

      await getPublicStaticPage(req as any, res);

      expect(CmsPageService.getPageBySlug).toHaveBeenCalledWith("test");
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockResult,
        "general.success",
        "en"
      );
    });

    it("should return not found", async () => {
      req = mockRequest({ slug: "test" });
      (CmsPageService.getPageBySlug as jest.Mock).mockRejectedValue(new Error("error.pageNotFound"));

      await getPublicStaticPage(req as any, res);

      expect(ResponseHandler.notFound).toHaveBeenCalledWith(
        res,
        "cms.pageNotFound",
        "en"
      );
    });

    it("should handle error", async () => {
      req = mockRequest({ slug: "test" });
      (CmsPageService.getPageBySlug as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await getPublicStaticPage(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });
});
