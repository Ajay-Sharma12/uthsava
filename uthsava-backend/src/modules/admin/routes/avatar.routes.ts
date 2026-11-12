import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../../core/middleware/validate.middleware";
import {
  listAdminAvatars,
  getAvatarById,
  createAdminAvatar,
  updateAdminAvatar,
  updateAdminAvatarStatus,
  deleteAdminAvatar,
  listAvatarCategories,
  createAvatarCategory,
} from "../../avatar/controllers/avatar.controller";
import {
  createAvatarSchema,
  updateAvatarSchema,
  adminListAvatarsQuerySchema,
  avatarIdParamSchema,
  avatarStatusSchema,
  createAvatarCategorySchema,
} from "../../avatar/validators/avatar.validator";

const router = Router();

/**
 * Admin Avatar Routes
 * All routes are protected by authenticate + authorize([ADMIN, ADMIN_SUB_USER, PRODUCER])
 * and requireSubAdminPermission("avatars") mounted in admin.routes.ts.
 * Base path: /api/v1/admin/avatars
 */

/**
 * GET /api/v1/admin/avatars/categories
 * List avatar categories for dropdown selection.
 */
router.get(
  "/categories",
  listAvatarCategories
);

/**
 * POST /api/v1/admin/avatars/categories
 * Create a new avatar category.
 */
router.post(
  "/categories",
  validateBody(createAvatarCategorySchema),
  createAvatarCategory
);

/**
 * GET /api/v1/admin/avatars
 * List avatar categories with pagination, search, isKids filter, status filter.
 */
router.get(
  "/",
  validateQuery(adminListAvatarsQuerySchema),
  listAdminAvatars
);

/**
 * GET /api/v1/admin/avatars/:avatarId
 * Retrieve a single avatar category document.
 */
router.get(
  "/:avatarId",
  validateParams(avatarIdParamSchema),
  getAvatarById
);

/**
 * POST /api/v1/admin/avatars
 * Create a new avatar category entry with multiple images.
 */
router.post(
  "/",
  validateBody(createAvatarSchema),
  createAdminAvatar
);

/**
 * PUT /api/v1/admin/avatars/:avatarId
 * Full update of an avatar category.
 */
router.put(
  "/:avatarId",
  validateParams(avatarIdParamSchema),
  validateBody(updateAvatarSchema),
  updateAdminAvatar
);

/**
 * PATCH /api/v1/admin/avatars/:avatarId/status
 * Toggle the active / inactive status.
 */
router.patch(
  "/:avatarId/status",
  validateParams(avatarIdParamSchema),
  validateBody(avatarStatusSchema),
  updateAdminAvatarStatus
);

/**
 * DELETE /api/v1/admin/avatars/:avatarId
 * Delete an avatar category entry.
 */
router.delete(
  "/:avatarId",
  validateParams(avatarIdParamSchema),
  deleteAdminAvatar
);

export default router;
