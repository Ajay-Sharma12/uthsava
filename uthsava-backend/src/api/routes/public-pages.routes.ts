import { Router } from "express";
import { getPublicStaticPage } from "../../modules/admin/controllers/cms-page.controller";

const router = Router();

/**
 * Public Pages Routes
 * Base path: /api/v1/pages
 *
 * Query parameters:
 * - slug: The page slug (required)
 * - lang: Language code (optional, defaults to Accept-Language header)
 *
 * Example: /api/v1/pages?slug=terms&lang=en
 */
router.get("/", getPublicStaticPage);

export default router;
