import { Router } from "express";
import {
  validateBody,
  validateQuery,
} from "../../../core/middleware/validate.middleware";
import {
  sendNotification,
  listNotifications,
  getNotificationById,
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
} from "../controllers/notification.controller";
import {
  sendNotificationSchema,
  listNotificationsQuerySchema,
} from "../validators/notification.validator";
import { requireSubAdminPermission } from "../../../core/middleware/subadmin-permission.middleware";

const router = Router();

/**
 * Notification Routes
 * Base path: /api/v1/admin/notifications
 *
 * Authentication + base authorization ([ADMIN, ADMIN_SUB_USER]) are applied
 * by the parent admin router.
 *
 * POST /                    — Send notification (push / email / sms) to a group or specific users
 * GET  /                    — List all admin-sent notifications (paginated)
 * GET  /:id                 — Get a single notification by ID (with recipient user details)
 * GET  /my-notifications    — In-app inbox for the logged-in user
 * GET  /unread-count        — Unread badge count for the logged-in user
 * PATCH /mark-all-read      — Mark all as read for the logged-in user
 * PATCH /:id/mark-read      — Mark a single notification as read
 */

// Admin: Send notification
router.post("/", requireSubAdminPermission("notifications", "create"), validateBody(sendNotificationSchema), sendNotification);

// Admin: List sent notifications
router.get("/", requireSubAdminPermission("notifications", "view"), validateQuery(listNotificationsQuerySchema), listNotifications);

// User: In-app inbox (must be before /:id to avoid shadowing)
router.get("/my-notifications", getMyNotifications);

// User: Unread badge count (must be before /:id to avoid shadowing)
router.get("/unread-count", getUnreadCount);

// Admin: Get single notification by ID
router.get("/:id", requireSubAdminPermission("notifications", "view"), getNotificationById);

// User: Mark all as read
router.patch("/mark-all-read", markAllNotificationsAsRead);

// User: Mark one as read
router.patch("/:id/mark-read", markNotificationAsRead);

export default router;
