import { Router } from "express";
import { getCmsPageBySlug } from "../admin/controllers/cms-page.controller";

const router = Router();

/**
 * Public CMS Routes
 * Base path: /api/v1/cms
 */
router.get("/:slug", getCmsPageBySlug);

export default router;
