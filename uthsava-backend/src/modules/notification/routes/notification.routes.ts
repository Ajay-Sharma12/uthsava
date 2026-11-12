import { Router } from "express";
import { authenticate } from "../../../core/middleware/auth.middleware";
import {
  getMyNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
} from "../controllers/notification.controller";

const router = Router();

/**
 * Notification Routes
 * All routes require authentication
 */
router.use(authenticate);

// Get all notifications for logged-in user
router.get("/", getMyNotifications);

// Get unread notification count
router.get("/unread-count", getUnreadCount);

// Mark all notifications as read
router.patch("/mark-all-read", markAllNotificationsAsRead);

// Mark specific notification as read
router.patch("/:id/mark-read", markNotificationAsRead);

// Soft delete a specific notification
router.delete("/:id", deleteNotification);

// Soft delete all notifications
router.delete("/", deleteAllNotifications);

export default router;
