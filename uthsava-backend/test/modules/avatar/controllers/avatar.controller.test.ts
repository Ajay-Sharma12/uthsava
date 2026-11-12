/// <reference types="jest" />
import { Request, Response } from "express";
import avatarController, {
  getActiveAvatars,
  getActiveAvatarCategoriesMobile,
  createAvatar,
  listAdminAvatars,
  getAvatarById,
  createAdminAvatar,
  updateAdminAvatar,
  updateAdminAvatarStatus,
  deleteAdminAvatar,
  listAvatarCategories,
  createAvatarCategory,
} from "../../../../src/modules/avatar/controllers/avatar.controller";
import { AvatarService } from "../../../../src/modules/avatar/services/avatar.service";
import { ResponseHandler } from "../../../../src/common/responses/response.handler";
import { SubAdminActivityHelper } from "../../../../src/modules/shared/helpers/subadmin-activity.helper";

jest.mock("../../../../src/modules/avatar/services/avatar.service");
jest.mock("../../../../src/common/responses/response.handler");
jest.mock("../../../../src/modules/shared/helpers/language.helper", () => ({
  getLanguage: jest.fn().mockReturnValue("en"),
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

const mockRequest = (
  params: any = {},
  query: any = {},
  body: any = {},
  user: any = undefined,
  headers: any = {}
) => {
  return {
    params,
    query,
    body,
    user,
    headers,
    method: "GET",
    originalUrl: "/test",
    socket: { remoteAddress: "127.0.0.1" },
  } as unknown as Request;
};

describe("AvatarController Unit Tests", () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
  });

  describe("getActiveAvatars", () => {
    it("[Positive] should return active avatars list", async () => {
      req = mockRequest({}, { iskids: "true", category: "Superheroes", page: "1", limit: "10" });
      const mockData = { total: 1, categories: [] };
      (AvatarService.getActiveAvatars as jest.Mock).mockResolvedValue(mockData);

      await getActiveAvatars(req, res);

      expect(AvatarService.getActiveAvatars).toHaveBeenCalledWith(true, "Superheroes", 1, 10);
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, mockData, "general.success", "en");
    });

    it("[Negative] should handle 500 error when service throws exception", async () => {
      req = mockRequest({}, {});
      const error = new Error("DB Error");
      (AvatarService.getActiveAvatars as jest.Mock).mockRejectedValue(error);

      await getActiveAvatars(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "general.error", "en", 500, error);
    });
  });

  describe("getActiveAvatarCategoriesMobile", () => {
    it("[Positive] should return active avatar categories for mobile", async () => {
      req = mockRequest({}, { isKids: "false", page: "1", limit: "10" });
      const mockData = { total: 1, categories: [] };
      (AvatarService.getActiveAvatars as jest.Mock).mockResolvedValue(mockData);

      await getActiveAvatarCategoriesMobile(req, res);

      expect(AvatarService.getActiveAvatars).toHaveBeenCalledWith(false, undefined, 1, 10);
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, mockData, "avatar_category.listed", "en");
    });
  });

  describe("createAvatar", () => {
    it("[Positive] should create legacy avatar successfully with HTTP 201", async () => {
      req = mockRequest({}, {}, { category: "Cartoons" }, { sub: "user123" });
      const mockCreated = { id: "a1", category: "Cartoons" };
      (AvatarService.createAvatar as jest.Mock).mockResolvedValue(mockCreated);

      await createAvatar(req, res);

      expect(AvatarService.createAvatar).toHaveBeenCalledWith({ category: "Cartoons" }, "user123");
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, mockCreated, "general.success", "en", 201);
    });

    it("[Validation/Negative] should return badRequest when error message is validation error", async () => {
      req = mockRequest({}, {}, {});
      (AvatarService.createAvatar as jest.Mock).mockRejectedValue(new Error("validation.failed"));

      await createAvatar(req, res);

      expect(ResponseHandler.badRequest).toHaveBeenCalledWith(res, "validation.failed", "en");
    });
  });

  describe("listAdminAvatars", () => {
    it("[Positive] should list admin avatars with filters", async () => {
      req = mockRequest({}, { search: "hero", isKids: "true", status: "active" });
      const mockResult = { data: [], pagination: {} };
      (AvatarService.listAdminAvatars as jest.Mock).mockResolvedValue(mockResult);

      await listAdminAvatars(req, res);

      expect(AvatarService.listAdminAvatars).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, mockResult, "general.success", "en");
    });
  });

  describe("getAvatarById", () => {
    it("[Positive] should return single avatar category by ID", async () => {
      req = mockRequest({ avatarId: "av123" });
      const mockAvatar = { _id: "av123", category: "Anime" };
      (AvatarService.getAvatarById as jest.Mock).mockResolvedValue(mockAvatar);

      await getAvatarById(req, res);

      expect(AvatarService.getAvatarById).toHaveBeenCalledWith("av123");
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, mockAvatar, "general.success", "en");
    });

    it("[Negative] should return 404 notFound when avatar not found", async () => {
      req = mockRequest({ avatarId: "nonexistent" });
      (AvatarService.getAvatarById as jest.Mock).mockResolvedValue(null);

      await getAvatarById(req, res);

      expect(ResponseHandler.notFound).toHaveBeenCalledWith(res, "Avatar category not found", "en");
    });
  });

  describe("createAdminAvatar", () => {
    it("[Positive] should create admin avatar category and log activity", async () => {
      req = mockRequest({}, {}, { category: "Fantasy" }, { sub: "admin1", role: "ADMIN" });
      const mockCreated = { _id: "av1", category: "Fantasy" };
      (AvatarService.createAvatar as jest.Mock).mockResolvedValue(mockCreated);

      await createAdminAvatar(req, res);

      expect(AvatarService.createAvatar).toHaveBeenCalledWith({ category: "Fantasy" }, "admin1");
      expect(SubAdminActivityHelper.logActivity).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockCreated,
        "Avatar category created successfully",
        "en",
        201
      );
    });
  });

  describe("updateAdminAvatar", () => {
    it("[Positive] should update avatar category successfully", async () => {
      req = mockRequest({ avatarId: "av123" }, {}, { category: "Updated" }, { sub: "admin1", role: "ADMIN" });
      const mockUpdated = { _id: "av123", category: "Updated" };
      (AvatarService.updateAvatar as jest.Mock).mockResolvedValue(mockUpdated);

      await updateAdminAvatar(req, res);

      expect(AvatarService.updateAvatar).toHaveBeenCalledWith("av123", { category: "Updated" }, "admin1");
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, mockUpdated, "Avatar category updated successfully", "en");
    });

    it("[Negative] should return 404 notFound when avatar category to update does not exist", async () => {
      req = mockRequest({ avatarId: "nonexistent" }, {}, {});
      (AvatarService.updateAvatar as jest.Mock).mockResolvedValue(null);

      await updateAdminAvatar(req, res);

      expect(ResponseHandler.notFound).toHaveBeenCalledWith(res, "Avatar category not found", "en");
    });
  });

  describe("updateAdminAvatarStatus", () => {
    it("[Positive] should update status of avatar category", async () => {
      req = mockRequest({ avatarId: "av123" }, {}, { status: "inactive" }, { sub: "admin1", role: "ADMIN" });
      const mockUpdated = { _id: "av123", status: "inactive" };
      (AvatarService.updateAvatarStatus as jest.Mock).mockResolvedValue(mockUpdated);

      await updateAdminAvatarStatus(req, res);

      expect(AvatarService.updateAvatarStatus).toHaveBeenCalledWith("av123", "inactive", "admin1");
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, mockUpdated, "Avatar status updated successfully", "en");
    });
  });

  describe("deleteAdminAvatar", () => {
    it("[Positive] should delete avatar category document", async () => {
      req = mockRequest({ avatarId: "av123" }, {}, {}, { sub: "admin1", role: "ADMIN" });
      (AvatarService.deleteAvatar as jest.Mock).mockResolvedValue(true);

      await deleteAdminAvatar(req, res);

      expect(AvatarService.deleteAvatar).toHaveBeenCalledWith("av123");
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { message: "Avatar category deleted successfully" },
        "Avatar category deleted successfully",
        "en"
      );
    });

    it("[Negative] should return 404 notFound when avatar category to delete is missing", async () => {
      req = mockRequest({ avatarId: "nonexistent" });
      (AvatarService.deleteAvatar as jest.Mock).mockResolvedValue(false);

      await deleteAdminAvatar(req, res);

      expect(ResponseHandler.notFound).toHaveBeenCalledWith(res, "Avatar category not found", "en");
    });
  });

  describe("listAvatarCategories & createAvatarCategory", () => {
    it("[Positive] should list all avatar categories for dropdown selection", async () => {
      req = mockRequest({}, {});
      (AvatarService.listAvatarCategories as jest.Mock).mockResolvedValue([{ _id: "c1", category: "Nature" }]);

      await listAvatarCategories(req, res);

      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { totalCategories: 1, categories: [{ _id: "c1", category: "Nature" }] },
        "avatar_category.listed",
        "en"
      );
    });

    it("[Positive] should create avatar category standalone entry", async () => {
      req = mockRequest({}, {}, { name: "Sci-Fi" }, { sub: "admin1", role: "ADMIN" });
      (AvatarService.createAvatarCategory as jest.Mock).mockResolvedValue({ _id: "c2", name: "Sci-Fi" });

      await createAvatarCategory(req, res);

      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { _id: "c2", name: "Sci-Fi" },
        "avatar_category.created",
        "en",
        201
      );
    });
  });
});
