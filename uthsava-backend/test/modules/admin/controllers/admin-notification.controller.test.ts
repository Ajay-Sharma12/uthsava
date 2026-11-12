import { Request, Response } from "express";
import {
  listNotifications,
  sendNotification,
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
} from "../../../../src/modules/admin/controllers/notification.controller";
import { NotificationService } from "../../../../src/modules/admin/services/notification.service";
import { ResponseHandler } from "../../../../src/common/responses/response.handler";
import { PaginationHelper } from "../../../../src/modules/shared/helpers/pagination.helper";
import { HTTP_STATUS } from "../../../../src/core/constants/app.constants";

jest.mock("../../../../src/modules/admin/services/notification.service");
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

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (query: any = {}, params: any = {}, body: any = {}, user: any = { sub: "60c72b2f9b1d8b001c8e4b5a" }) => {
  return {
    query,
    params,
    body,
    user,
  } as unknown as Request;
};

describe("Admin Notification Controller", () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
  });

  describe("listNotifications", () => {
    it("should return notifications successfully", async () => {
      req = mockRequest({ search: "promo", sendTo: "all_users", category: "offer", status: "sent" });
      const mockPaginationParams = { page: 1, limit: 10, sortBy: "createdAt", sortOrder: "desc" };
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue(mockPaginationParams);
      
      const mockResult = { data: [], total: 0 };
      (NotificationService.buildSearchQuery as jest.Mock).mockReturnValue({ title: "promo" });
      (NotificationService.listNotifications as jest.Mock).mockResolvedValue(mockResult);

      await listNotifications(req as any, res);

      expect(PaginationHelper.parseParams).toHaveBeenCalled();
      expect(NotificationService.listNotifications).toHaveBeenCalledWith(
        mockPaginationParams,
        expect.any(Object)
      );
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockResult,
        "general.success",
        "en"
      );
    });

    it("should handle unauthorized", async () => {
      req = mockRequest({}, {}, {}, {});

      await listNotifications(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "auth.unauthorized",
        "en",
        HTTP_STATUS.UNAUTHORIZED
      );
    });

    it("should handle generic errors", async () => {
      req = mockRequest();
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue({});
      (NotificationService.listNotifications as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await listNotifications(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("sendNotification", () => {
    it("should send notification successfully", async () => {
      req = mockRequest({}, {}, {
        title: "Test",
        message: "Test message",
        category: "new_content",
        notificationTypes: ["push"],
        sendTo: "all_users"
      });
      const mockResult = { _id: "notif1" };
      (NotificationService.sendNotification as jest.Mock).mockResolvedValue(mockResult);

      await sendNotification(req as any, res);

      expect(NotificationService.sendNotification).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockResult,
        "Notification sent successfully",
        "en",
        HTTP_STATUS.CREATED
      );
    });

    it("should handle unauthorized", async () => {
      req = mockRequest({}, {}, {}, {});

      await sendNotification(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "auth.unauthorized",
        "en",
        HTTP_STATUS.UNAUTHORIZED
      );
    });

    it("should handle generic errors", async () => {
      req = mockRequest({}, {}, {
        title: "Test",
        message: "Test message",
        category: "new_content",
        notificationTypes: ["push"],
        sendTo: "all_users"
      });
      (NotificationService.sendNotification as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await sendNotification(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("getMyNotifications", () => {
    it("should get user notifications", async () => {
      req = mockRequest();
      const mockPaginationParams = { page: 1, limit: 10, sortBy: "createdAt", sortOrder: "desc" };
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue(mockPaginationParams);
      const mockResult = { data: [], total: 0 };
      (NotificationService.getUserNotifications as jest.Mock).mockResolvedValue(mockResult);

      await getMyNotifications(req as any, res);

      expect(NotificationService.getUserNotifications).toHaveBeenCalledWith(
        expect.any(Object),
        mockPaginationParams
      );
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        mockResult,
        "general.success",
        "en"
      );
    });

    it("should handle unauthorized", async () => {
      req = mockRequest({}, {}, {}, {});

      await getMyNotifications(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "auth.unauthorized",
        "en",
        HTTP_STATUS.UNAUTHORIZED
      );
    });

    it("should handle generic errors", async () => {
      req = mockRequest();
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue({});
      (NotificationService.getUserNotifications as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await getMyNotifications(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("markNotificationAsRead", () => {
    it("should mark as read", async () => {
      req = mockRequest({}, { id: "notif1" });
      (NotificationService.markAsRead as jest.Mock).mockResolvedValue(true);

      await markNotificationAsRead(req as any, res);

      expect(NotificationService.markAsRead).toHaveBeenCalledWith("notif1", expect.any(Object));
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        true,
        "general.success",
        "en"
      );
    });

    it("should handle unauthorized", async () => {
      req = mockRequest({}, {}, {}, {});

      await markNotificationAsRead(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "auth.unauthorized",
        "en",
        HTTP_STATUS.UNAUTHORIZED
      );
    });

    it("should handle generic errors", async () => {
      req = mockRequest({}, { id: "notif1" });
      (NotificationService.markAsRead as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await markNotificationAsRead(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("markAllNotificationsAsRead", () => {
    it("should mark all as read", async () => {
      req = mockRequest();
      (NotificationService.markAllAsRead as jest.Mock).mockResolvedValue(true);

      await markAllNotificationsAsRead(req as any, res);

      expect(NotificationService.markAllAsRead).toHaveBeenCalledWith(expect.any(Object));
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        true,
        "general.success",
        "en"
      );
    });

    it("should handle unauthorized", async () => {
      req = mockRequest({}, {}, {}, {});

      await markAllNotificationsAsRead(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "auth.unauthorized",
        "en",
        HTTP_STATUS.UNAUTHORIZED
      );
    });

    it("should handle generic errors", async () => {
      req = mockRequest();
      (NotificationService.markAllAsRead as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await markAllNotificationsAsRead(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  describe("getUnreadCount", () => {
    it("should get unread count", async () => {
      req = mockRequest();
      (NotificationService.getUnreadCount as jest.Mock).mockResolvedValue(5);

      await getUnreadCount(req as any, res);

      expect(NotificationService.getUnreadCount).toHaveBeenCalledWith(expect.any(Object));
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        5,
        "general.success",
        "en"
      );
    });

    it("should handle unauthorized", async () => {
      req = mockRequest({}, {}, {}, {});

      await getUnreadCount(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "auth.unauthorized",
        "en",
        HTTP_STATUS.UNAUTHORIZED
      );
    });

    it("should handle generic errors", async () => {
      req = mockRequest();
      (NotificationService.getUnreadCount as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await getUnreadCount(req as any, res);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });
});
