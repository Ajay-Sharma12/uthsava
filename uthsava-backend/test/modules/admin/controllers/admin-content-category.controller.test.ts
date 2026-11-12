/// <reference types="jest" />
import { Request, Response } from "express";
import {
  listPublicContentCategories,
  listContentCategories,
  getContentCategoryById,
  createContentCategory,
  updateContentCategory,
  updateContentCategoryStatus,
  updateContentCategoryDisplayOrder,
  deleteContentCategory,
} from "../../../../src/modules/admin/controllers/content-category.controller";
import { ContentCategoryService, ERROR_MESSAGES } from "../../../../src/modules/admin/services/content-category.service";
import { ResponseHandler } from "../../../../src/common/responses/response.handler";
import { PaginationHelper } from "../../../../src/modules/shared/helpers/pagination.helper";
import { HTTP_STATUS } from "../../../../src/core/constants/app.constants";
import { type as CategoryGenreType } from "../../../../src/models";

jest.mock("../../../../src/modules/admin/services/content-category.service");
jest.mock("../../../../src/common/responses/response.handler");
jest.mock("../../../../src/modules/shared/helpers/pagination.helper");
jest.mock("../../../../src/modules/shared/helpers/language.helper", () => ({
  getLanguage: jest.fn().mockReturnValue("en"),
}));
jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    error: jest.fn(),
  },
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

describe("Content Category Controller API Tests", () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
  });

  describe("listPublicContentCategories", () => {
    it("should list active categories successfully", async () => {
      req = mockRequest({ type: CategoryGenreType.CATEGORY });
      const mockItems = [{ id: "1", name: "Action" }];
      (ContentCategoryService.listActive as jest.Mock).mockResolvedValue(mockItems);

      await listPublicContentCategories(req, res);

      expect(ContentCategoryService.listActive).toHaveBeenCalledWith(CategoryGenreType.CATEGORY);
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { data: mockItems },
        "contentCategory.listed",
        "en"
      );
    });

    it("should return validation error for invalid type", async () => {
      req = mockRequest({ type: "invalid_type" });

      await listPublicContentCategories(req, res);

      expect(ResponseHandler.validationError).toHaveBeenCalled();
    });
  });

  describe("listContentCategories", () => {
    it("should list categories with pagination", async () => {
      req = mockRequest({ page: "1", limit: "10", type: CategoryGenreType.CATEGORY });
      const mockPaginationParams = { page: 1, limit: 10 };
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue(mockPaginationParams);
      
      const mockResult = { data: [], pagination: {}, counts: {} };
      (ContentCategoryService.list as jest.Mock).mockResolvedValue(mockResult);

      await listContentCategories(req, res);

      expect(ContentCategoryService.list).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });

  describe("getContentCategoryById", () => {
    it("should return category successfully", async () => {
      req = mockRequest({}, { categoryId: "1" });
      const mockItem = { id: "1", name: "Action" };
      (ContentCategoryService.getById as jest.Mock).mockResolvedValue(mockItem);

      await getContentCategoryById(req, res);

      expect(ContentCategoryService.getById).toHaveBeenCalledWith("1");
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle not found error", async () => {
      req = mockRequest({}, { categoryId: "1" });
      (ContentCategoryService.getById as jest.Mock).mockResolvedValue(null);

      await getContentCategoryById(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        ERROR_MESSAGES.NOT_FOUND,
        "en",
        HTTP_STATUS.NOT_FOUND
      );
    });
  });

  describe("createContentCategory", () => {
    it("should create category successfully", async () => {
      req = mockRequest({}, {}, { name: "New Category" }, { sub: "admin1" });
      const mockItem = { id: "1", name: "New Category" };
      (ContentCategoryService.create as jest.Mock).mockResolvedValue(mockItem);

      await createContentCategory(req, res);

      expect(ContentCategoryService.create).toHaveBeenCalledWith(req.body, "admin1");
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it("should handle name exists error", async () => {
      req = mockRequest({}, {}, { name: "Existing" }, { sub: "admin1" });
      (ContentCategoryService.create as jest.Mock).mockRejectedValue(new Error(ERROR_MESSAGES.NAME_EXISTS));

      await createContentCategory(req, res);

      expect(ResponseHandler.validationError).toHaveBeenCalled();
    });
  });

  describe("updateContentCategory", () => {
    it("should update category successfully", async () => {
      req = mockRequest({}, { categoryId: "1" }, { name: "Updated" }, { sub: "admin1" });
      const mockItem = { id: "1", name: "Updated" };
      (ContentCategoryService.update as jest.Mock).mockResolvedValue(mockItem);

      await updateContentCategory(req, res);

      expect(ContentCategoryService.update).toHaveBeenCalledWith("1", req.body, "admin1");
      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });

  describe("updateContentCategoryStatus", () => {
    it("should update status successfully", async () => {
      req = mockRequest({}, { categoryId: "1" }, { status: "ACTIVE" });
      const mockItem = { id: "1", status: "ACTIVE" };
      (ContentCategoryService.updateStatus as jest.Mock).mockResolvedValue(mockItem);

      await updateContentCategoryStatus(req, res);

      expect(ContentCategoryService.updateStatus).toHaveBeenCalledWith("1", "ACTIVE");
      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });

  describe("updateContentCategoryDisplayOrder", () => {
    it("should update display order successfully", async () => {
      req = mockRequest({}, { categoryId: "1" }, { displayOrder: 2 });
      const mockItem = { id: "1", displayOrder: 2 };
      (ContentCategoryService.updateDisplayOrder as jest.Mock).mockResolvedValue(mockItem);

      await updateContentCategoryDisplayOrder(req, res);

      expect(ContentCategoryService.updateDisplayOrder).toHaveBeenCalledWith("1", 2);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });

  describe("deleteContentCategory", () => {
    it("should delete category successfully", async () => {
      req = mockRequest({}, { categoryId: "1" });
      (ContentCategoryService.delete as jest.Mock).mockResolvedValue(true);

      await deleteContentCategory(req, res);

      expect(ContentCategoryService.delete).toHaveBeenCalledWith("1");
      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });
});
