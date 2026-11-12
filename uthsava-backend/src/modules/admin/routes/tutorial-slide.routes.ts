import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../../core/middleware/validate.middleware";
import {
  listTutorialSlides,
  getTutorialSlideById,
  createTutorialSlide,
  updateTutorialSlide,
  updateTutorialSlideStatus,
  deleteTutorialSlide,
  normalizeTutorialSlideSequences,
} from "../controllers/tutorial-slide.controller";
import {
  createTutorialSlideSchema,
  listTutorialSlidesQuerySchema,
  tutorialSlideIdParamSchema,
  tutorialSlideStatusSchema,
  updateTutorialSlideSchema
} from "../validators/tutorial-slide.validator";

const router = Router();

/**
 * Admin Tutorial Slide Routes
 * All routes are protected by authenticate + authorize([ADMIN, ADMIN_SUB_USER])
 * and requireSubAdminPermission("tutorial_slides") applied in admin.routes.ts.
 * Base path: /api/v1/admin/tutorial-slides
 */

/**
 * GET /api/v1/admin/tutorial-slides
 * List all slides with search, mediaType / status filter, date range, pagination.
 */
router.get(
  "/",
  validateQuery(listTutorialSlidesQuerySchema),
  listTutorialSlides,
);

/**
 * POST /api/v1/admin/tutorial-slides/normalize-sequences
 * Repairs sequence gaps – re-assigns 1,2,3… to all active slides in order.
 * Safe to call multiple times (idempotent).
 */
router.post("/normalize-sequences", normalizeTutorialSlideSequences);

/**
 * GET /api/v1/admin/tutorial-slides/:slideId
 * Retrieve a single slide with resolved CloudFront preview URLs.
 */
router.get(
  "/:slideId",
  validateParams(tutorialSlideIdParamSchema),
  getTutorialSlideById,
);

/**
 * POST /api/v1/admin/tutorial-slides
 * Create a new tutorial slide.
 * Body: { title, description, mediaType, image?, video?, sequence, status? }
 */
router.post(
  "/",
  validateBody(createTutorialSlideSchema),
  createTutorialSlide,
);

/**
 * PUT /api/v1/admin/tutorial-slides/:slideId
 * Full update of an existing slide.
 * Body: { title?, description?, mediaType?, image?, video?, sequence?, status? }
 */
router.put(
  "/:slideId",
  validateParams(tutorialSlideIdParamSchema),
  validateBody(updateTutorialSlideSchema),
  updateTutorialSlide,
);

/**
 * PATCH /api/v1/admin/tutorial-slides/:slideId/status
 * Toggle the active / inactive status (maps to the listing-table toggle).
 * Body: { status: "active" | "inactive" }
 */
router.patch(
  "/:slideId/status",
  validateParams(tutorialSlideIdParamSchema),
  validateBody(tutorialSlideStatusSchema),
  updateTutorialSlideStatus,
);

/**
 * DELETE /api/v1/admin/tutorial-slides/:slideId
 * Delete a tutorial slide.
 */
router.delete(
  "/:slideId",
  validateParams(tutorialSlideIdParamSchema),
  deleteTutorialSlide,
);

export default router;
