import { Types } from "mongoose";
import { NotificationService } from "../../../../src/modules/admin/services/notification.service";
import { AdminSentNotification, Notification, User } from "../../../../src/models";
import { PaginationHelper } from "../../../../src/modules/shared/helpers/pagination.helper";
import { sendPushNotificationToUser } from "../../../../src/modules/shared/helpers/notification.helper";
import { QueueService } from "../../../../src/modules/shared/services/queue.service";
import { sendBulkSms } from "../../../../src/modules/shared/services/sms.service";

jest.mock("../../../../src/models");
jest.mock("../../../../src/modules/shared/helpers/pagination.helper");
jest.mock("../../../../src/modules/shared/helpers/notification.helper");
jest.mock("../../../../src/modules/shared/services/queue.service");
jest.mock("../../../../src/modules/shared/services/sms.service");
jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("Notification Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listNotifications", () => {
    it("should list notifications successfully", async () => {
      const mockResult = { data: [], total: 0 };
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue({});
      (PaginationHelper.paginate as jest.Mock).mockResolvedValue(mockResult);

      const result = await NotificationService.listNotifications({} as any, {});

      expect(PaginationHelper.paginate).toHaveBeenCalledWith(
        AdminSentNotification,
        {},
        {}
      );
      expect(result).toBe(mockResult);
    });

    it("should throw error if paginate fails", async () => {
      (PaginationHelper.paginate as jest.Mock).mockRejectedValue(new Error("DB Error"));

      await expect(NotificationService.listNotifications({} as any, {})).rejects.toThrow("DB Error");
    });
  });

  describe("sendNotification", () => {
    it("should create scheduled notification without sending", async () => {
      const mockResult = { _id: "admin-notif-1" };
      (AdminSentNotification.create as jest.Mock).mockResolvedValue(mockResult);
      (User.find as jest.Mock).mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const result = await NotificationService.sendNotification({
        senderId: new Types.ObjectId(),
        sendTo: "ALL_USERS" as any,
        notificationTypes: ["PUSH" as any],
        category: "offer_promo" as any,
        title: "Test",
        message: "Test",
        status: "SCHEDULED" as any,
        scheduledAt: futureDate,
      });

      expect(AdminSentNotification.create).toHaveBeenCalled();
      expect(sendPushNotificationToUser).not.toHaveBeenCalled();
      expect(result).toBe(mockResult);
    });

    it("should send immediate notification to resolved users", async () => {
      const mockUsers = [{ _id: new Types.ObjectId(), fcmTokens: ["token1"], email: "test@test.com", mobile: "123", countryCode: "91" }];
      (User.find as jest.Mock).mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(mockUsers) }) });
      const mockResult = { _id: "admin-notif-1", status: "SENT", save: jest.fn() };
      (AdminSentNotification.create as jest.Mock).mockResolvedValue(mockResult);
      (sendPushNotificationToUser as jest.Mock).mockResolvedValue({ success: true, failed: 0 });

      const result = await NotificationService.sendNotification({
        senderId: new Types.ObjectId(),
        sendTo: "ALL_USERS" as any,
        notificationTypes: ["PUSH" as any, "EMAIL" as any, "SMS" as any],
        category: "offer_promo" as any,
        title: "Test",
        message: "Test",
        status: "SENT" as any,
      });

      expect(AdminSentNotification.create).toHaveBeenCalled();
      expect(sendPushNotificationToUser).toHaveBeenCalled();
      expect(QueueService.addEmailJob).toHaveBeenCalled();
      expect(sendBulkSms).toHaveBeenCalled();
      expect(mockResult.status).toBe("SENT");
    });
  });

  describe("getUserNotifications", () => {
    it("should list user notifications successfully", async () => {
      const mockResult = { data: [], total: 0 };
      (PaginationHelper.parseParams as jest.Mock).mockReturnValue({});
      (PaginationHelper.paginate as jest.Mock).mockResolvedValue(mockResult);
      (Notification.countDocuments as jest.Mock).mockResolvedValue(5);

      const result = await NotificationService.getUserNotifications(new Types.ObjectId(), {} as any);

      expect(PaginationHelper.paginate).toHaveBeenCalledWith(
        Notification,
        expect.any(Object),
        {},
        undefined,
        expect.any(Array)
      );
      expect(result).toEqual({ ...mockResult, unreadCount: 5 });
    });
  });

  describe("markAsRead", () => {
    it("should mark notification as read", async () => {
      (Notification.findOneAndUpdate as jest.Mock).mockResolvedValue(true);

      const result = await NotificationService.markAsRead("notif1", new Types.ObjectId());

      expect(Notification.findOneAndUpdate).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe("markAllAsRead", () => {
    it("should mark all as read", async () => {
      (Notification.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 5 });

      const result = await NotificationService.markAllAsRead(new Types.ObjectId());

      expect(Notification.updateMany).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe("getUnreadCount", () => {
    it("should return unread count", async () => {
      (Notification.countDocuments as jest.Mock).mockResolvedValue(10);

      const result = await NotificationService.getUnreadCount(new Types.ObjectId());

      expect(Notification.countDocuments).toHaveBeenCalled();
      expect(result).toEqual({ count: 10 });
    });
  });
});
