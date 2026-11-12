import request from "supertest";
import express from "express";
import notificationRoutes from "../../../../src/modules/notification/routes/notification.routes";
import {
  getMyNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
} from "../../../../src/modules/notification/controllers/notification.controller";

// Mock controllers
jest.mock("../../../../src/modules/notification/controllers/notification.controller", () => ({
  getMyNotifications: jest.fn((req, res) => res.status(200).json({ success: true })),
  getUnreadCount: jest.fn((req, res) => res.status(200).json({ success: true })),
  markNotificationAsRead: jest.fn((req, res) => res.status(200).json({ success: true })),
  markAllNotificationsAsRead: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteNotification: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteAllNotifications: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

// Mock auth middleware
jest.mock("../../../../src/core/middleware/auth.middleware", () => ({
  authenticate: jest.fn((req, res, next) => next()),
}));

describe("Notification Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/v1/notifications", notificationRoutes);
  });

  it("GET /api/v1/notifications routes to getMyNotifications", async () => {
    await request(app).get("/api/v1/notifications");
    expect(getMyNotifications).toHaveBeenCalled();
  });

  it("GET /api/v1/notifications/unread-count routes to getUnreadCount", async () => {
    await request(app).get("/api/v1/notifications/unread-count");
    expect(getUnreadCount).toHaveBeenCalled();
  });

  it("PATCH /api/v1/notifications/mark-all-read routes to markAllNotificationsAsRead", async () => {
    await request(app).patch("/api/v1/notifications/mark-all-read");
    expect(markAllNotificationsAsRead).toHaveBeenCalled();
  });

  it("PATCH /api/v1/notifications/:id/mark-read routes to markNotificationAsRead", async () => {
    await request(app).patch("/api/v1/notifications/notif123/mark-read");
    expect(markNotificationAsRead).toHaveBeenCalled();
  });

  it("DELETE /api/v1/notifications/:id routes to deleteNotification", async () => {
    await request(app).delete("/api/v1/notifications/notif123");
    expect(deleteNotification).toHaveBeenCalled();
  });

  it("DELETE /api/v1/notifications routes to deleteAllNotifications", async () => {
    await request(app).delete("/api/v1/notifications");
    expect(deleteAllNotifications).toHaveBeenCalled();
  });
});
