/// <reference types="jest" />
import { Types } from "mongoose";
import { NotificationService } from "../../../../src/modules/notification/services/notification.service";
import { Notification } from "../../../../src/models";
import { PaginationHelper } from "../../../../src/modules/shared/helpers/pagination.helper";
import { QueryBuilder } from "../../../../src/modules/shared/helpers/query-builder.helper";

// Mock dependencies
jest.mock("../../../../src/models", () => ({
  Notification: {
    countDocuments: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateMany: jest.fn(),
  },
}));
jest.mock("../../../../src/modules/shared/helpers/pagination.helper");
jest.mock("../../../../src/modules/shared/helpers/query-builder.helper");
jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe("NotificationService Tests", () => {
  const mockUserId = new Types.ObjectId();
  const mockNotificationId = new Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* =========================================================================
   * getUserNotifications Method Tests
   * ========================================================================= */
  describe("getUserNotifications", () => {
    it("[Positive] should successfully return paginated notifications and unread count", async () => {
      const mockResult = {
        docs: [{ _id: mockNotificationId, title: "Test Notification" }],
        totalDocs: 1,
        limit: 10,
        page: 1,
      };

      (PaginationHelper.parseParams as jest.Mock).mockReturnValue({ page: 1, limit: 10 });
      (PaginationHelper.paginate as jest.Mock).mockResolvedValue(mockResult);
      (Notification.countDocuments as jest.Mock).mockResolvedValue(5);

      const result = await NotificationService.getUserNotifications(mockUserId, { page: 1, limit: 10 });

      expect(PaginationHelper.parseParams).toHaveBeenCalled();
      expect(PaginationHelper.paginate).toHaveBeenCalledWith(
        Notification,
        { userId: mockUserId, deletedAt: null },
        { page: 1, limit: 10 },
        undefined,
        expect.any(Array)
      );
      expect(Notification.countDocuments).toHaveBeenCalledWith({ userId: mockUserId, isRead: false });
      expect(result).toEqual({ ...mockResult, unreadCount: 5 });
    });
  });

  /* =========================================================================
   * getUnreadCount Method Tests
   * ========================================================================= */
  describe("getUnreadCount", () => {
    it("[Positive] should return the unread count from database", async () => {
      (Notification.countDocuments as jest.Mock).mockResolvedValue(3);

      const result = await NotificationService.getUnreadCount(mockUserId);

      expect(Notification.countDocuments).toHaveBeenCalledWith({
        userId: mockUserId,
        isRead: false,
        deletedAt: null,
      });
      expect(result).toBe(3);
    });
  });

  /* =========================================================================
   * markAsRead Method Tests
   * ========================================================================= */
  describe("markAsRead", () => {
    it("[Positive] should mark a specific notification as read", async () => {
      const mockNotification = { _id: mockNotificationId, isRead: true };
      (Notification.findOneAndUpdate as jest.Mock).mockResolvedValue(mockNotification);

      const result = await NotificationService.markAsRead(mockNotificationId, mockUserId);

      expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockNotificationId, userId: mockUserId, deletedAt: null },
        { isRead: true },
        { new: true }
      );
      expect(result).toEqual(mockNotification);
    });

    it("[Negative] should throw error if notification not found or doesn't belong to user", async () => {
      (Notification.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(
        NotificationService.markAsRead(mockNotificationId, mockUserId)
      ).rejects.toThrow("Notification not found");
    });
  });

  /* =========================================================================
   * markAllAsRead Method Tests
   * ========================================================================= */
  describe("markAllAsRead", () => {
    it("[Positive] should successfully mark all notifications as read for the user", async () => {
      (Notification.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 3 });

      const result = await NotificationService.markAllAsRead(mockUserId);

      expect(Notification.updateMany).toHaveBeenCalledWith(
        { userId: mockUserId, isRead: false, deletedAt: null },
        { isRead: true }
      );
      expect(result).toEqual({ success: true });
    });
  });

  /* =========================================================================
   * deleteNotification Method Tests
   * ========================================================================= */
  describe("deleteNotification", () => {
    it("[Positive] should successfully soft delete a specific notification", async () => {
      const mockNotification = { _id: mockNotificationId, deletedAt: new Date() };
      (Notification.findOneAndUpdate as jest.Mock).mockResolvedValue(mockNotification);

      const result = await NotificationService.deleteNotification(mockNotificationId, mockUserId);

      expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockNotificationId, userId: mockUserId },
        { deletedAt: expect.any(Date) },
        { new: true }
      );
      expect(result.success).toBe(true);
      expect(result.deletedAt).toBeDefined();
    });

    it("[Negative] should throw error if notification to delete is not found", async () => {
      (Notification.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(
        NotificationService.deleteNotification(mockNotificationId, mockUserId)
      ).rejects.toThrow("Notification not found");
    });
  });

  /* =========================================================================
   * deleteAllNotifications Method Tests
   * ========================================================================= */
  describe("deleteAllNotifications", () => {
    it("[Positive] should successfully soft delete all active user notifications", async () => {
      (Notification.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 4 });

      const result = await NotificationService.deleteAllNotifications(mockUserId);

      expect(Notification.updateMany).toHaveBeenCalledWith(
        { userId: mockUserId, deletedAt: null },
        { deletedAt: expect.any(Date) }
      );
      expect(result).toEqual({ success: true, deletedCount: 4 });
    });
  });

  /* =========================================================================
   * buildSearchQuery Method Tests
   * ========================================================================= */
  describe("buildSearchQuery", () => {
    it("[Positive] should return query structure from QueryBuilder when search query is defined", () => {
      const mockQuery = { $or: [{ title: /test/i }] };
      (QueryBuilder.buildSearchQuery as jest.Mock).mockReturnValue(mockQuery);

      const result = NotificationService.buildSearchQuery("test");

      expect(QueryBuilder.buildSearchQuery).toHaveBeenCalledWith("test", ["title", "description"]);
      expect(result).toEqual(mockQuery);
    });

    it("[Edge] should return empty object when search query is empty or undefined", () => {
      const result = NotificationService.buildSearchQuery(undefined);
      expect(result).toEqual({});
    });
  });
});
