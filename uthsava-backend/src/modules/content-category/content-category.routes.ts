import { Router } from "express";
import {
  listPublicContentCategories,
  listActiveContentCategoriesMobile,
} from "../admin/controllers/content-category.controller";

const router = Router();

/**
 * Public & Mobile Category & Genre Routes
 * Base path: /api/v1/categories
 */

const handleCategoryOrList = (req: any, res: any, next: any) => {
  if (req.baseUrl && req.baseUrl.endsWith("/category")) {
    return listActiveContentCategoriesMobile(req, res);
  }
  return listPublicContentCategories(req, res);
};

/**
 * GET /api/v1/categories/category
 * GET /api/v1/category
 *
 * Mobile GET API to retrieve active categories and genres.
 * Query Params: ?type=category | ?type=genre | ?type=all
 */
router.get("/category", listActiveContentCategoriesMobile);

/**
 * GET /api/v1/categories
 * Returns active items sorted by displayOrder then name.
 */
router.get("/", handleCategoryOrList);

export default router;
