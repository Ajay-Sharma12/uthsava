import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../../core/middleware/validate.middleware";
import {
  listAwardBadges,
  getAwardBadgeById,
  createAwardBadge,
  updateAwardBadge,
  updateAwardBadgeStatus,
} from "../controllers/award-badge.controller";
import {
  awardBadgeIdParamSchema,
  awardBadgeStatusSchema,
  createAwardBadgeSchema,
  listAwardBadgesQuerySchema,
  updateAwardBadgeSchema
} from "../validators/award-badge.validator";

const router = Router();

/**
 * GET /api/v1/admin/award-badges
 * List all awards & badges with search, filter and pagination.
 *
 * Query params: search, type, status, fromDate, toDate,
 *               sortBy, sortOrder, page, limit
 */
router.get("/", validateQuery(listAwardBadgesQuerySchema), listAwardBadges);

/**
 * GET /api/v1/admin/award-badges/:awardBadgeId
 * Retrieve a single award/badge with populated content assignments.
 */
router.get(
  "/:awardBadgeId",
  validateParams(awardBadgeIdParamSchema),
  getAwardBadgeById,
);

/**
 * POST /api/v1/admin/award-badges
 * Create a new award or badge.
 * Body: { type, name, contentIds?, status? }
 */
router.post("/", validateBody(createAwardBadgeSchema), createAwardBadge);

/**
 * PUT /api/v1/admin/award-badges/:awardBadgeId
 * Full update of an existing award/badge.
 * Body: { type?, name?, contentIds?, status? }
 */
router.put(
  "/:awardBadgeId",
  validateParams(awardBadgeIdParamSchema),
  validateBody(updateAwardBadgeSchema),
  updateAwardBadge,
);

/**
 * PATCH /api/v1/admin/award-badges/:awardBadgeId/status
 * Toggle the active/inactive status (maps to the listing-table toggle).
 * Body: { status: "active" | "inactive" }
 */
router.patch(
  "/:awardBadgeId/status",
  validateParams(awardBadgeIdParamSchema),
  validateBody(awardBadgeStatusSchema),
  updateAwardBadgeStatus,
);

export default router;
