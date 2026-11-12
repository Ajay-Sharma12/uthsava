import { Router } from "express";
import {
  listAuditLogs,
  getAuditLogById,
} from "../controllers/audit-log.controller";

const router = Router();

/**
 * @route   GET /api/v1/admin/audit-logs
 * @desc    Get paginated, filterable audit logs
 * @access  Admin / Sub-Admin
 */
router.get(
  "/",
  listAuditLogs,
);

/**
 * @route   GET /api/v1/admin/audit-logs/:logId
 * @desc    Get details of a specific audit log
 * @access  Admin / Sub-Admin
 */
router.get(
  "/:logId",
  getAuditLogById,
);

export default router;
