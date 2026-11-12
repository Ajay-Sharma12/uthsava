/// <reference types="jest" />
import { Request, Response } from "express";
import {
  createRole,
  updateRole,
  getRoleById,
  listRoles,
  deleteRole,
} from "../../../../src/modules/admin/controllers/role.controller";
import { RoleService } from "../../../../src/modules/admin/services/role.service";
import { ResponseHandler } from "../../../../src/common/responses/response.handler";
import { PaginationHelper } from "../../../../src/modules/shared/helpers/pagination.helper";

jest.mock("../../../../src/modules/admin/services/role.service");
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

const mockRequest = (query: any = {}, params: any = {}, body: any = {}) => {
  return {
    query,
    params,
    body,
  } as unknown as Request;
};

describe("Role Controller API Tests", () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
  });

  describe("createRole", () => {
    it("should create role successfully", async () => {
      req = mockRequest({}, {}, { name: "Test Role" });
      const mockRole = { _id: "1", name: "Test Role" };
      (RoleService.createRole as jest.Mock).mockResolvedValue(mockRole);

      await createRole(req, res);

      expect(RoleService.createRole).toHaveBeenCalledWith(req.body);
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { role: mockRole },
        "role.created",
        "en",
        201
      );
    });

    it("should handle name exists error", async () => {
      req = mockRequest({}, {}, { name: "Test Role" });
      (RoleService.createRole as jest.Mock).mockRejectedValue(new Error("role.name_exists"));

      await createRole(req, res);

      expect(ResponseHandler.validationError).toHaveBeenCalledWith(
        res,
        { name: "Role name already exists" },
        "validation.failed",
        "en"
      );
    });

    it("should handle general error", async () => {
      req = mockRequest({}, {}, { name: "Test Role" });
      (RoleService.createRole as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await createRole(req, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("updateRole", () => {
    it("should update role successfully", async () => {
      req = mockRequest({}, { roleId: "1" }, { name: "Updated Role" });
      const mockRole = { _id: "1", name: "Updated Role" };
      (RoleService.updateRole as jest.Mock).mockResolvedValue(mockRole);

      await updateRole(req, res);

      expect(RoleService.updateRole).toHaveBeenCalledWith("1", req.body);
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { role: mockRole },
        "role.updated",
        "en"
      );
    });

    it("should handle not found error", async () => {
      req = mockRequest({}, { roleId: "1" }, { name: "Updated Role" });
      (RoleService.updateRole as jest.Mock).mockResolvedValue(null);

      await updateRole(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "role.not_found",
        "en",
        404
      );
    });
  });

  describe("getRoleById", () => {
    it("should get role successfully", async () => {
      req = mockRequest({}, { roleId: "1" });
      const mockRole = { _id: "1", name: "Test Role" };
      (RoleService.getRoleById as jest.Mock).mockResolvedValue(mockRole);

      await getRoleById(req, res);

      expect(RoleService.getRoleById).toHaveBeenCalledWith("1");
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { role: mockRole },
        "role.retrieved",
        "en"
      );
    });

    it("should handle not found error", async () => {
      req = mockRequest({}, { roleId: "1" });
      (RoleService.getRoleById as jest.Mock).mockResolvedValue(null);

      await getRoleById(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "role.not_found",
        "en",
        404
      );
    });
  });

  describe("listRoles", () => {
    it("should list roles successfully", async () => {
      req = mockRequest({ page: "1", limit: "10" });
      const mockPaginationParams = { page: 1, limit: 10 };
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue(mockPaginationParams);
      
      const mockResult = { data: [], pagination: {} };
      (RoleService.listRoles as jest.Mock).mockResolvedValue(mockResult);

      await listRoles(req, res);

      expect(RoleService.listRoles).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockResult,
        "role.listed",
        "en"
      );
    });
  });

  describe("deleteRole", () => {
    it("should delete role successfully", async () => {
      req = mockRequest({}, { roleId: "1" });
      (RoleService.deleteRole as jest.Mock).mockResolvedValue(undefined);

      await deleteRole(req, res);

      expect(RoleService.deleteRole).toHaveBeenCalledWith("1");
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        null,
        "role.deleted",
        "en"
      );
    });

    it("should handle role in use error", async () => {
      req = mockRequest({}, { roleId: "1" });
      (RoleService.deleteRole as jest.Mock).mockRejectedValue(new Error("role.in_use"));
      await deleteRole(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "error.roleIsCurrentlyAssignedToOneOrMoreSubadmins",
        "en",
        400
      );
    });
  });
});
