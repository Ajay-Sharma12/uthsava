import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboard.controller";
import {
  authenticate,
  authorize,
} from "../../../core/middleware/auth.middleware";
import { Role } from "../../../common/types/auth.types";

const router = Router();

/**
 * Protected Admin Routes - require authentication
 * Base path: /api/v1/admin/dashboard
 */

// Temporarily public for testing - REMOVE IN PRODUCTION
// router.get('/stats', getDashboardStats);

// Authenticate + authorize all roles that have admin panel access
router.use(authenticate, authorize([Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER]));
router.get("/stats", getDashboardStats);

export default router;
