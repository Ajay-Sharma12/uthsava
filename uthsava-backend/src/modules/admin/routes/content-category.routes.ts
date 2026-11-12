import { Router } from "express";
import {
  listContentCategories,
  getContentCategoryById,
  createContentCategory,
  updateContentCategory,
  updateContentCategoryStatus,
  updateContentCategoryDisplayOrder,
  deleteContentCategory,
} from "../controllers/content-category.controller";
import {
  contentCategoryIdParamSchema,
  createContentCategorySchema,
  updateContentCategorySchema,
  updateContentCategoryStatusSchema,
  updateDisplayOrderSchema,
  listContentCategoriesQuerySchema,
} from "../validators/content-category.validator";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../../core/middleware/validate.middleware";
import { authorize } from "../../../core/middleware/auth.middleware";
import { Role } from "../../../common/types/auth.types";

const router = Router();

/**
 * Category & Genre Management Routes
 * Base path: /api/v1/admin/categories
 *
 * Use query/body `type`: "category" | "genre" to distinguish records.
 * Authentication + base authorization applied by parent admin router.
 */

router.get(
  "/",
  validateQuery(listContentCategoriesQuerySchema),
  listContentCategories,
);
router.get(
  "/:categoryId",
  validateParams(contentCategoryIdParamSchema),
  getContentCategoryById,
);

router.post(
  "/",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER]),
  validateBody(createContentCategorySchema),
  createContentCategory,
);
router.put(
  "/:categoryId",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER]),
  validateParams(contentCategoryIdParamSchema),
  validateBody(updateContentCategorySchema),
  updateContentCategory,
);
router.patch(
  "/:categoryId/status",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER]),
  validateParams(contentCategoryIdParamSchema),
  validateBody(updateContentCategoryStatusSchema),
  updateContentCategoryStatus,
);
router.patch(
  "/:categoryId/display-order",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER]),
  validateParams(contentCategoryIdParamSchema),
  validateBody(updateDisplayOrderSchema),
  updateContentCategoryDisplayOrder,
);
router.delete(
  "/:categoryId",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER]),
  validateParams(contentCategoryIdParamSchema),
  deleteContentCategory,
);

export default router;
