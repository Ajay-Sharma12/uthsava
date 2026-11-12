/// <reference types="jest" />
import { Request, Response } from "express";
import {
  listSubAdmins,
  getSubAdminById,
  createSubAdmin,
  updateSubAdmin,
  updateSubAdminStatus,
  listSubAdminActivities,
  deleteSubAdmin,
} from "../../../../src/modules/admin/controllers/subadmin.controller";
import { SubAdminService, ERROR_MESSAGES } from "../../../../src/modules/admin/services/subadmin.service";
import { ResponseHandler } from "../../../../src/common/responses/response.handler";
import { PaginationHelper } from "../../../../src/modules/shared/helpers/pagination.helper";
import { QueryBuilder } from "../../../../src/modules/shared/helpers/query-builder.helper";
import { HTTP_STATUS } from "../../../../src/core/constants/app.constants";

jest.mock("../../../../src/modules/admin/services/subadmin.service");
jest.mock("../../../../src/common/responses/response.handler");
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

const mockRequest = (query: any = {}, params: any = {}, body: any = {}, user: any = null) => {
  return {
    query,
    params,
    body,
    user,
  } as unknown as Request;
};

describe("SubAdmin Controller API Tests", () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
    (SubAdminService.sanitizeSubAdmin as jest.Mock).mockImplementation((data) => data);
  });

  describe("listSubAdmins", () => {
    it("should return paginated list of subadmins", async () => {
      req = mockRequest({ search: "test", status: "ACTIVE" }, {}, {}, { sub: "507f1f77bcf86cd799439011" });
      
      const mockResult = {
        data: [{ _id: "sub1" }],
        pagination: { totalPages: 1 },
        counts: { total: 1 }
      };

      (SubAdminService.listSubAdmins as jest.Mock).mockResolvedValue(mockResult);

      await listSubAdmins(req, res);
      if (!(SubAdminService.listSubAdmins as jest.Mock).mock.calls.length) {
        console.log("Error calls:", (ResponseHandler.error as jest.Mock).mock.calls);
      }

      expect(SubAdminService.listSubAdmins).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          data: mockResult.data,
          pagination: mockResult.pagination,
          counts: mockResult.counts
        }),
        "subadmin.listed",
        "en"
      );
    });

    it("should handle list errors", async () => {
      req = mockRequest();
      (SubAdminService.listSubAdmins as jest.Mock).mockRejectedValue(new Error("DB Error"));
      await listSubAdmins(req, res);
      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "general.error", "en", HTTP_STATUS.INTERNAL_SERVER_ERROR, expect.any(Error));
    });
  });

  describe("getSubAdminById", () => {
    it("should return formatted subadmin data with role and permissions", async () => {
      req = mockRequest({}, { subAdminId: "user1" });
      
      const mockSubAdmin = {
        _id: "user1",
        roleId: { name: "Test Role" },
        permissions: { users: { view: true } },
        customPermissions: { cms: { view: true } },
        isActionRequired: true,
      };

      (SubAdminService.getSubAdminById as jest.Mock).mockResolvedValue(mockSubAdmin);

      await getSubAdminById(req, res);

      expect(SubAdminService.getSubAdminById).toHaveBeenCalledWith("user1");
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        {
          subAdmin: mockSubAdmin,
          role: mockSubAdmin.roleId,
          permissions: mockSubAdmin.permissions,
          customPermissions: mockSubAdmin.customPermissions,
          isActionRequired: true,
        },
        "subadmin.retrieved",
        "en"
      );
    });

    it("should return not found if missing", async () => {
      req = mockRequest({}, { subAdminId: "user1" });
      (SubAdminService.getSubAdminById as jest.Mock).mockResolvedValue(null);

      await getSubAdminById(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "subadmin.not_found",
        "en",
        404
      );
    });

    it("should handle INVALID_SUBADMIN_ID validation error", async () => {
      req = mockRequest({}, { subAdminId: "invalid" });
      (SubAdminService.getSubAdminById as jest.Mock).mockRejectedValue(new Error(ERROR_MESSAGES.INVALID_SUBADMIN_ID));

      await getSubAdminById(req, res);

      expect(ResponseHandler.validationError).toHaveBeenCalled();
    });
  });

  describe("createSubAdmin", () => {
    it("should create subadmin successfully", async () => {
      req = mockRequest({}, {}, { email: "test@test.com" }, { sub: "507f1f77bcf86cd799439011" });
      const mockCreated = { subAdmin: { _id: "sub1" }, temporaryPassword: "temp" };
      (SubAdminService.createSubAdmin as jest.Mock).mockResolvedValue(mockCreated);

      await createSubAdmin(req, res);

      expect(SubAdminService.createSubAdmin).toHaveBeenCalledWith(
        expect.objectContaining({ addedBy: "507f1f77bcf86cd799439011" }),
        expect.anything()
      );
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, mockCreated, "subadmin.created", "en", HTTP_STATUS.CREATED);
    });

    it("should handle EMAIL_EXISTS error uniquely", async () => {
      req = mockRequest({}, {}, { email: "test@test.com" });
      (SubAdminService.createSubAdmin as jest.Mock).mockRejectedValue(new Error(ERROR_MESSAGES.EMAIL_EXISTS));

      await createSubAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.UNPROCESSABLE_ENTITY);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe("updateSubAdmin", () => {
    it("should update subadmin successfully", async () => {
      req = mockRequest({}, { subAdminId: "sub1" }, { firstName: "Jane" });
      (SubAdminService.updateSubAdmin as jest.Mock).mockResolvedValue({ _id: "sub1", firstName: "Jane" });

      await updateSubAdmin(req, res);
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, expect.any(Object), "subadmin.updated", "en");
    });

    it("should return 404 if updated subadmin not found", async () => {
      req = mockRequest({}, { subAdminId: "sub1" }, {});
      (SubAdminService.updateSubAdmin as jest.Mock).mockResolvedValue(null);

      await updateSubAdmin(req, res);
      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "subadmin.not_found", "en", HTTP_STATUS.NOT_FOUND);
    });
  });

  describe("updateSubAdminStatus", () => {
    it("should update subadmin status", async () => {
      req = mockRequest({}, { subAdminId: "sub1" }, { status: "INACTIVE" });
      (SubAdminService.updateSubAdmin as jest.Mock).mockResolvedValue({ _id: "sub1", status: "INACTIVE" });

      await updateSubAdminStatus(req, res);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });

  describe("listSubAdminActivities", () => {
    it("should list activities", async () => {
      req = mockRequest({}, { subAdminId: "sub1" });
      (SubAdminService.listSubAdminActivities as jest.Mock).mockResolvedValue({ data: [] });
      await listSubAdminActivities(req, res);
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, { data: [] }, "subadmin.activities.listed", "en");
    });
  });

  describe("deleteSubAdmin", () => {
    it("should delete subadmin successfully", async () => {
      req = mockRequest({}, { subAdminId: "sub1" });
      (SubAdminService.deleteSubAdmin as jest.Mock).mockResolvedValue(undefined);

      await deleteSubAdmin(req, res);
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, null, "subadmin.deleted", "en");
    });
    
    it("should handle not found error", async () => {
      req = mockRequest({}, { subAdminId: "sub1" });
      (SubAdminService.deleteSubAdmin as jest.Mock).mockRejectedValue(new Error(ERROR_MESSAGES.SUBADMIN_NOT_FOUND));

      await deleteSubAdmin(req, res);
      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "subadmin.not_found", "en", HTTP_STATUS.NOT_FOUND);
    });
  });
});
