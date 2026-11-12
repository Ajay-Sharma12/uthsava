import { Router } from "express";
import {
  listCmsPages,
  createCmsPage,
  getCmsPageById,
  updateCmsPage,
  updateCmsPageStatus,
  updateCmsPagePublicationStatus,
  deleteCmsPage,
} from "../controllers/cms-page.controller";
import { validateBody } from "../../../core/middleware/validate.middleware";
import {
  authenticate,
  authorize,
} from "../../../core/middleware/auth.middleware";
import { Role } from "../../../common/types/auth.types";
import {
  createCmsPageSchema,
  updateCmsPageSchema,
  updateCmsPageStatusSchema,
  updateCmsPagePublicationStatusSchema,
} from "../validators/cms-page.validator";

const router = Router();

/**
 * Protected Admin Routes - require authentication
 * Base path: /api/v1/admin
 */

router.use(authenticate, authorize([Role.ADMIN, Role.ADMIN_SUB_USER]));

// CMS Pages Management
router.get("/", listCmsPages);
router.post("/", validateBody(createCmsPageSchema), createCmsPage);
router.get("/:pageId", getCmsPageById);
router.put("/:pageId", validateBody(updateCmsPageSchema), updateCmsPage);
router.patch(
  "/:pageId/status",
  validateBody(updateCmsPageStatusSchema),
  updateCmsPageStatus,
);
// Alternative endpoint for active-status
router.patch(
  "/:pageId/active-status",
  validateBody(updateCmsPageStatusSchema),
  updateCmsPageStatus,
);
// Endpoint for publication-status
router.patch(
  "/:pageId/publication-status",
  validateBody(updateCmsPagePublicationStatusSchema),
  updateCmsPagePublicationStatus,
);
router.delete("/:pageId", deleteCmsPage);

export default router;
