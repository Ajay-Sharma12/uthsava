import { Router } from "express";
import notificationRoutes from "./routes/notification.routes";

const router = Router();

/**
 * Notification Module Routes
 * Base path: /api/v1/notifications
 */
router.use("/", notificationRoutes);

export default router;
