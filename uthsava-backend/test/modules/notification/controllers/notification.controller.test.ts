/// <reference types="jest" />
import { Request, Response } from "express";
import {
  getMyNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
} from "../../../../src/modules/notification/controllers/notification.controller";
import { NotificationService } from "../../../../src/modules/notification/services/notification.service";
import { ResponseHandler } from "../../../../src/common/responses/response.handler";
import { PaginationHelper } from "../../../../src/modules/shared/helpers/pagination.helper";
import { HTTP_STATUS } from "../../../../src/core/constants/app.constants";

// Mock dependencies
jest.mock("../../../../src/modules/notification/services/notification.service");
jest.mock("../../../../src/common/responses/response.handler");
jest.mock("../../../../src/modules/shared/helpers/pagination.helper");
jest.mock("../../../../src/modules/shared/helpers/language.helper", () => ({
  getLanguage: jest.fn().mockReturnValue("en"),
}));
jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (userSub?: string, params: any = {}, query: any = {}) => {
  return {
    user: userSub ? { sub: userSub } : undefined,
    params,
    query,
  } as unknown as Request;
};

describe("NotificationController Tests", () => {
  let req: Request;
  let res: Response;
  const mockUserId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
  });

  /* =========================================================================
   * getMyNotifications Tests
   * ========================================================================= */
  describe("getMyNotifications", () => {
    it("[Positive] should successfully return user notifications list", async () => {
      req = mockRequest(mockUserId, {}, { page: "1" });
      const mockParsedParams = { page: 1, limit: 10 };
      const mockServiceResult = { docs: [], totalDocs: 0, unreadCount: 2 };

      (PaginationHelper.parseParams as jest.Mock).mockReturnValue(mockParsedParams);
      (NotificationService.getUserNotifications as jest.Mock).mockResolvedValue(mockServiceResult);

      await getMyNotifications(req, res);

      expect(PaginationHelper.parseParams).toHaveBeenCalledWith(req.query, ["createdAt", "title"]);
      expect(NotificationService.getUserNotifications).toHaveBeenCalledWith(expect.any(Object), mockParsedParams);
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, mockServiceResult, "general.success", "en");
    });

    it("[Negative] should return unauthorized error if user is not authenticated", async () => {
      req = mockRequest(undefined);

      await getMyNotifications(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "Unauthorized",
        "en",
        HTTP_STATUS.UNAUTHORIZED,
        expect.any(Error)
      );
    });

    it("[Edge] should return error if service call fails", async () => {
      req = mockRequest(mockUserId);
      (NotificationService.getUserNotifications as jest.Mock).mockRejectedValue(new Error("Service failed"));

      await getMyNotifications(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "general.error",
        "en",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        expect.any(Error)
      );
    });
  });

  /* =========================================================================
   * getUnreadCount Tests
   * ========================================================================= */
  describe("getUnreadCount", () => {
    it("[Positive] should successfully return count", async () => {
      req = mockRequest(mockUserId);
      (NotificationService.getUnreadCount as jest.Mock).mockResolvedValue(5);

      await getUnreadCount(req, res);

      expect(NotificationService.getUnreadCount).toHaveBeenCalledWith(expect.any(Object));
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, { count: 5 }, "general.success", "en");
    });

    it("[Negative] should return unauthorized if user not in req", async () => {
      req = mockRequest(undefined);

      await getUnreadCount(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "Unauthorized",
        "en",
        HTTP_STATUS.UNAUTHORIZED,
        expect.any(Error)
      );
    });
  });

  /* =========================================================================
   * markNotificationAsRead Tests
   * ========================================================================= */
  describe("markNotificationAsRead", () => {
    const mockNotifId = "notif123";

    it("[Positive] should call service with parameters and return success response", async () => {
      req = mockRequest(mockUserId, { id: mockNotifId });
      const mockResult = { _id: mockNotifId, isRead: true };
      (NotificationService.markAsRead as jest.Mock).mockResolvedValue(mockResult);

      await markNotificationAsRead(req, res);

      expect(NotificationService.markAsRead).toHaveBeenCalledWith(mockNotifId, expect.any(Object));
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, mockResult, "general.success", "en");
    });

    it("[Negative] should return unauthorized if user sub is missing", async () => {
      req = mockRequest(undefined, { id: mockNotifId });

      await markNotificationAsRead(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "Unauthorized",
        "en",
        HTTP_STATUS.UNAUTHORIZED,
        expect.any(Error)
      );
    });
  });

  /* =========================================================================
   * markAllNotificationsAsRead Tests
   * ========================================================================= */
  describe("markAllNotificationsAsRead", () => {
    it("[Positive] should call markAllAsRead service successfully", async () => {
      req = mockRequest(mockUserId);
      const mockResult = { success: true };
      (NotificationService.markAllAsRead as jest.Mock).mockResolvedValue(mockResult);

      await markAllNotificationsAsRead(req, res);

      expect(NotificationService.markAllAsRead).toHaveBeenCalledWith(expect.any(Object));
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, mockResult, "general.success", "en");
    });
  });

  /* =========================================================================
   * deleteNotification Tests
   * ========================================================================= */
  describe("deleteNotification", () => {
    const mockNotifId = "notif123";

    it("[Positive] should call service delete and return success response", async () => {
      req = mockRequest(mockUserId, { id: mockNotifId });
      const mockResult = { success: true };
      (NotificationService.deleteNotification as jest.Mock).mockResolvedValue(mockResult);

      await deleteNotification(req, res);

      expect(NotificationService.deleteNotification).toHaveBeenCalledWith(mockNotifId, expect.any(Object));
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, mockResult, "general.success", "en");
    });
  });

  /* =========================================================================
   * deleteAllNotifications Tests
   * ========================================================================= */
  describe("deleteAllNotifications", () => {
    it("[Positive] should call service deleteAll and return success response", async () => {
      req = mockRequest(mockUserId);
      const mockResult = { success: true, deletedCount: 3 };
      (NotificationService.deleteAllNotifications as jest.Mock).mockResolvedValue(mockResult);

      await deleteAllNotifications(req, res);

      expect(NotificationService.deleteAllNotifications).toHaveBeenCalledWith(expect.any(Object));
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, mockResult, "general.success", "en");
    });
  });
});
