import request from "supertest";
import express from "express";
import notificationRoutes from "../../../../src/modules/admin/routes/notification.routes";
import { sendNotification, listNotifications, getMyNotifications, markNotificationAsRead, markAllNotificationsAsRead, getUnreadCount } from "../../../../src/modules/admin/controllers/notification.controller";

jest.mock("../../../../src/modules/admin/controllers/notification.controller", () => ({
  sendNotification: jest.fn((req, res) => res.status(200).json({ success: true })),
  listNotifications: jest.fn((req, res) => res.status(200).json({ success: true })),
  getNotificationById: jest.fn((req, res) => res.status(200).json({ success: true })),
  getMyNotifications: jest.fn((req, res) => res.status(200).json({ success: true })),
  markNotificationAsRead: jest.fn((req, res) => res.status(200).json({ success: true })),
  markAllNotificationsAsRead: jest.fn((req, res) => res.status(200).json({ success: true })),
  getUnreadCount: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

jest.mock("../../../../src/core/middleware/validate.middleware", () => ({
  validateBody: jest.fn(() => (req: any, res: any, next: any) => next()),
  validateQuery: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

jest.mock("../../../../src/core/middleware/subadmin-permission.middleware", () => ({
  requireSubAdminPermission: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

describe("Notification Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/notifications", notificationRoutes);
  });

  it("POST /notifications routes to sendNotification", async () => {
    await request(app).post("/notifications").send({});
    expect(sendNotification).toHaveBeenCalled();
  });

  it("GET /notifications routes to listNotifications", async () => {
    await request(app).get("/notifications");
    expect(listNotifications).toHaveBeenCalled();
  });

  it("GET /notifications/my-notifications routes to getMyNotifications", async () => {
    await request(app).get("/notifications/my-notifications");
    expect(getMyNotifications).toHaveBeenCalled();
  });

  it("GET /notifications/unread-count routes to getUnreadCount", async () => {
    await request(app).get("/notifications/unread-count");
    expect(getUnreadCount).toHaveBeenCalled();
  });

  it("PATCH /notifications/mark-all-read routes to markAllNotificationsAsRead", async () => {
    await request(app).patch("/notifications/mark-all-read").send({});
    expect(markAllNotificationsAsRead).toHaveBeenCalled();
  });

  it("PATCH /notifications/:id/mark-read routes to markNotificationAsRead", async () => {
    await request(app).patch("/notifications/1/mark-read").send({});
    expect(markNotificationAsRead).toHaveBeenCalled();
  });
});
