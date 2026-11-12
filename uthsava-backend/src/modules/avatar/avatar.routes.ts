import { Router } from "express";
import { validateBody, validateQuery } from "../../core/middleware/validate.middleware";
import {
  getActiveAvatars,
  createAvatar,
  listAvatarCategories,
  getActiveAvatarCategoriesMobile,
} from "./controllers/avatar.controller";
import { createAvatarSchema, getAvatarsQuerySchema } from "./validators/avatar.validator";

const router = Router();

/**
 * Avatar Routes
 * Base path: /api/v1/avatars
 */

const handleAvatarCategoryOrList = (req: any, res: any, next: any) => {
  if (req.baseUrl && req.baseUrl.endsWith("/avatar-category")) {
    return listAvatarCategories(req, res);
  }
  return getActiveAvatars(req, res);
};

/**
 * GET /api/v1/avatars/categories
 * Retrieve list of avatar category names for dropdown selection.
 */
router.get("/categories", listAvatarCategories);

/**
 * GET /api/v1/avatars/avatar-category
 * GET /api/v1/avatar-category
 *
 * Dedicated Mobile & Admin API to retrieve active avatar category names list (for dropdown selection).
 */
router.get("/avatar-category", listAvatarCategories);

/**
 * GET /api/v1/avatars
 * Public / App endpoint to retrieve active avatar images grouped by category in 1 single API call.
 */
router.get("/", validateQuery(getAvatarsQuerySchema), handleAvatarCategoryOrList);

/**
 * POST /api/v1/avatars
 * Upload / Create a new avatar entry.
 */
router.post("/", validateBody(createAvatarSchema), createAvatar);

export default router;
