import { Router } from "express";
import { getActiveTutorialSlides } from "./controllers/tutorial-slide.controller";

const router = Router();

/**
 * Mobile / TV Tutorial Slide Routes
 * Base path: /api/v1/tutorial-slides
 *
 * Public endpoints consumed by the mobile app and TV app during the
 * onboarding / tutorial carousel flow.
 *
 * No authentication required – only ACTIVE slides are returned,
 * inactive ones are filtered server-side.
 *
 * Admin routes (all slides, CRUD, requires token) live at:
 *   /api/v1/admin/tutorial-slides
 */

/**
 * GET /api/v1/tutorial-slides
 *
 * Returns all ACTIVE slides sorted by sequence ascending.
 * Each slide is an onboarding screen rendered in sequence order.
 * Sequence numbers are always contiguous (1, 2, 3 …) – gaps are
 * compacted automatically by the admin service when a slide is
 * toggled inactive or reordered.
 */
router.get("/", getActiveTutorialSlides);

export default router;
