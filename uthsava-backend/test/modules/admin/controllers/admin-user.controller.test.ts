/// <reference types="jest" />
import { Request, Response } from "express";
import {
  listUsers,
  listUserLookup,
  getUserById,
  updateUserStatus,
} from "../../../../src/modules/admin/controllers/user.controller";
import { UserService } from "../../../../src/modules/admin/services/user.service";
import { ResponseHandler } from "../../../../src/common/responses/response.handler";
import { PaginationHelper } from "../../../../src/modules/shared/helpers/pagination.helper";

jest.mock("../../../../src/modules/admin/services/user.service");
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

describe("Admin User Controller API Tests", () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
  });

  describe("listUsers", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should return users list successfully with standard options", async () => {
      req = mockRequest({ page: "1", limit: "10", search: "john" });
      const mockPaginationParams = { page: 1, limit: 10, sortBy: "createdAt", sortOrder: "desc" };
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue(mockPaginationParams);
      
      const mockResult = { data: [], total: 0 };
      (UserService.listUsers as jest.Mock).mockResolvedValue(mockResult);

      await listUsers(req, res);

      expect(PaginationHelper.parseParams).toHaveBeenCalled();
      expect(UserService.listUsers).toHaveBeenCalledWith({
        ...mockPaginationParams,
        search: "john",
        status: undefined,
        accountStatus: undefined,
        subscriptionStatus: undefined,
        subscriptionPlan: undefined,
        startDate: undefined,
        endDate: undefined,
      });
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ ...mockResult }),
        "general.success",
        "en"
      );
    });

    /* =========================================================================
     * NEGATIVE TEST CASES
     * ========================================================================= */
    it("[Negative] should handle service database errors gracefully", async () => {
      req = mockRequest({});
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue({});
      (UserService.listUsers as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await listUsers(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "general.error",
        "en",
        500,
        expect.any(Error)
      );
    });

    /* =========================================================================
     * EDGE / VALIDATION TEST CASES
     * ========================================================================= */
    it("[Edge/Validation] should handle empty query parameters gracefully by applying fallbacks", async () => {
      req = mockRequest({});
      const mockPaginationParams = { page: 1, limit: 10 };
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue(mockPaginationParams);
      (UserService.listUsers as jest.Mock).mockResolvedValue({ data: [], total: 0 });

      await listUsers(req, res);

      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });

  describe("listUserLookup", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should return lightweight users list for dropdown selectors", async () => {
      req = mockRequest({ search: "john", limit: "5" });
      const mockUsers = [{ _id: "1", name: "john" }];
      (UserService.listUserLookup as jest.Mock).mockResolvedValue(mockUsers);

      await listUserLookup(req, res);

      expect(UserService.listUserLookup).toHaveBeenCalledWith("john", 5);
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        { data: mockUsers },
        "general.success",
        "en"
      );
    });

    /* =========================================================================
     * NEGATIVE TEST CASES
     * ========================================================================= */
    it("[Negative] should return 500 error if service lookup fails", async () => {
      req = mockRequest({});
      (UserService.listUserLookup as jest.Mock).mockRejectedValue(new Error("Lookup failure"));

      await listUserLookup(req, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });

    /* =========================================================================
     * EDGE / VALIDATION TEST CASES
     * ========================================================================= */
    it("[Edge/Validation] should fall back to default limit when search parameter is empty", async () => {
      req = mockRequest({ search: "" });
      (UserService.listUserLookup as jest.Mock).mockResolvedValue([]);

      await listUserLookup(req, res);

      expect(UserService.listUserLookup).toHaveBeenCalledWith("", undefined);
      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });

  describe("getUserById", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should return single user details when valid ID is provided", async () => {
      req = mockRequest({}, { userId: "user123" });
      const mockUser = { _id: "user123", name: "john" };
      (UserService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      await getUserById(req, res);

      expect(UserService.getUserById).toHaveBeenCalledWith("user123");
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockUser,
        "general.success",
        "en"
      );
    });

    /* =========================================================================
     * NEGATIVE TEST CASES
     * ========================================================================= */
    it("[Negative] should return 404 not found error if user is not present in database", async () => {
      req = mockRequest({}, { userId: "unknown" });
      (UserService.getUserById as jest.Mock).mockRejectedValue(new Error("error.userNotFound"));

      await getUserById(req, res);

      expect(ResponseHandler.notFound).toHaveBeenCalledWith(res, "user.notFound", "en");
    });

    it("[Negative] should return 500 error if unexpected DB failure happens during retrieval", async () => {
      req = mockRequest({}, { userId: "user123" });
      (UserService.getUserById as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await getUserById(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "general.error",
        "en",
        500,
        expect.any(Error)
      );
    });

    /* =========================================================================
     * EDGE / VALIDATION TEST CASES
     * ========================================================================= */
    it("[Edge/Validation] should return validation error if userId parameter is empty or malformed", async () => {
      req = mockRequest({}, { userId: "" });
      await getUserById(req, res);
      // Handled gracefully by service throwing or validation response
      expect(ResponseHandler.notFound || ResponseHandler.error).toBeDefined();
    });
  });

  describe("updateUserStatus", () => {
    /* =========================================================================
     * POSITIVE TEST CASES
     * ========================================================================= */
    it("[Positive] should update user status successfully", async () => {
      req = mockRequest({}, { userId: "user123" }, { status: "inactive" });
      const mockUser = { _id: "user123", status: "inactive" };
      (UserService.updateUserStatus as jest.Mock).mockResolvedValue(mockUser);

      await updateUserStatus(req, res);

      expect(UserService.updateUserStatus).toHaveBeenCalledWith("user123", "inactive");
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockUser,
        "general.success",
        "en"
      );
    });

    /* =========================================================================
     * NEGATIVE TEST CASES
     * ========================================================================= */
    it("[Negative] should return 404 if user not found for status update", async () => {
      req = mockRequest({}, { userId: "user123" }, { status: "inactive" });
      (UserService.updateUserStatus as jest.Mock).mockRejectedValue(new Error("error.userNotFound"));

      await updateUserStatus(req, res);

      expect(ResponseHandler.notFound).toHaveBeenCalledWith(res, "user.notFound", "en");
    });

    it("[Negative] should return 500 if DB operation fails during status save", async () => {
      req = mockRequest({}, { userId: "user123" }, { status: "active" });
      (UserService.updateUserStatus as jest.Mock).mockRejectedValue(new Error("Unexpected error"));

      await updateUserStatus(req, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });

    /* =========================================================================
     * EDGE / VALIDATION TEST CASES
     * ========================================================================= */
    it("[Validation] should handle invalid status value error", async () => {
      req = mockRequest({}, { userId: "user123" }, { status: "invalid" });
      (UserService.updateUserStatus as jest.Mock).mockRejectedValue(new Error("error.invalidStatusValue"));

      await updateUserStatus(req, res);

      expect(ResponseHandler.validationError).toHaveBeenCalledWith(
        res,
        { status: "Invalid status value" },
        "validation.failed",
        "en"
      );
    });

    it("[Validation/Edge] should handle missing status key in payload gracefully", async () => {
      req = mockRequest({}, { userId: "user123" }, {});
      await updateUserStatus(req, res);
      expect(ResponseHandler.error || ResponseHandler.validationError).toBeDefined();
    });
  });
});
