import { Router } from "express";
import {
  listSubAdmins,
  listSubAdminActivities,
  getSubAdminById,
  createSubAdmin,
  updateSubAdmin,
  updateSubAdminStatus,
  deleteSubAdmin,
} from "../controllers/subadmin.controller";
import {
  subAdminIdParamSchema,
  createSubAdminSchema,
  updateSubAdminSchema,
  listSubAdminsFiltersSchema,
  updateSubAdminStatusSchema,
  listSubAdminActivitiesSchema,
} from "../validators/subadmin.validator";
import {
  validateParams,
  validateQuery,
  validateBody,
} from "../../../core/middleware/validate.middleware";
import { authorize } from "../../../core/middleware/auth.middleware";
import { Role } from "../../../common/types/auth.types";

const router = Router();

/**
 * Sub-Admin Management Routes
 * Base path: /api/v1/admin/sub-admins
 *
 * Authentication and base authorization ([ADMIN, ADMIN_SUB_USER]) are already
 * applied by the parent admin router.  Write operations (create / update /
 * delete) are restricted to the main ADMIN role only — sub-admins may only
 * view the sub-admin list and their own activity logs.
 */

// Read-only routes — accessible to ADMIN and ADMIN_SUB_USER (with sub_admins permission)
router.get("/", validateQuery(listSubAdminsFiltersSchema), listSubAdmins);
router.get(
  "/:subAdminId/activities",
  validateParams(subAdminIdParamSchema),
  validateQuery(listSubAdminActivitiesSchema),
  listSubAdminActivities,
);
router.get(
  "/:subAdminId",
  validateParams(subAdminIdParamSchema),
  getSubAdminById,
);

// Write routes — restricted to main ADMIN only
router.post(
  "/",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER]),
  validateBody(createSubAdminSchema),
  createSubAdmin,
);
router.put(
  "/:subAdminId",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER]),
  validateParams(subAdminIdParamSchema),
  validateBody(updateSubAdminSchema),
  updateSubAdmin,
);
router.patch(
  "/:subAdminId/status",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER]),
  validateParams(subAdminIdParamSchema),
  validateBody(updateSubAdminStatusSchema),
  updateSubAdminStatus,
);
router.delete(
  "/:subAdminId",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER]),
  validateParams(subAdminIdParamSchema),
  deleteSubAdmin,
);

export default router;
