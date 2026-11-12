import { Request, Response } from "express";
import { Types } from "mongoose";
import { ResponseHandler } from "../../../common/responses/response.handler";
import { getLanguage } from "../../shared/helpers/language.helper";
import { PaginationHelper } from "../../shared/helpers/pagination.helper";
import { logger } from "../../../core/constants/logger";
import { HTTP_STATUS } from "../../../core/constants/app.constants";
import { JwtPayload } from "../../../common/types/auth.types";
import { AwardBadgeStatus, AwardBadgeType } from "../../../models/award-badge.model";
import { AwardBadgeService } from "../services/award-badge.service";

// ─── Typed request ────────────────────────────────────────────────────────────

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// ─── Sort fields allowed by the admin listing ─────────────────────────────────

const AWARD_BADGE_SORT_FIELDS = [
  "name",
  "type",
  "status",
  "createdAt",
  "updatedAt",
];

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * List Awards & Badges
 * GET /api/v1/admin/award-badges
 *
 * Query params:
 *   search    – partial name match
 *   type      – "award" | "badge"
 *   status    – "active" | "inactive"
 *   fromDate  – ISO date (start of creation range)
 *   toDate    – ISO date (end of creation range)
 *   sortBy    – one of AWARD_BADGE_SORT_FIELDS
 *   sortOrder – "asc" | "desc"
 *   page      – page number (default 1)
 *   limit     – items per page (default 10, max 100)
 *
 * Response shape per row:
 *   type | name | createdAt | contentIds (populated with title) | status
 *   If contentIds is empty the frontend should display "N/A".
 */
export const listAwardBadges = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);

    const pagination = PaginationHelper.parseParams(
      req.query,
      AWARD_BADGE_SORT_FIELDS,
    );

    const filters = {
      search: req.query.search as string | undefined,
      type: req.query.type as AwardBadgeType | undefined,
      status: req.query.status as AwardBadgeStatus | undefined,
      fromDate: req.query.fromDate as string | undefined,
      toDate: req.query.toDate as string | undefined,
      assignedTo: req.query.assignedTo as string | undefined,
    };

    const result = await AwardBadgeService.listAwardBadges(pagination, filters);

    return ResponseHandler.success(res, result, "general.success", lang);
  } catch (error) {
    logger.error("List award-badges error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * Get Award/Badge by ID
 * GET /api/v1/admin/award-badges/:awardBadgeId
 *
 * Returns the full document with contentIds populated
 * (title, type, posterImage of each assigned movie/series).
 */
export const getAwardBadgeById = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { awardBadgeId } = req.params;

    const awardBadge = await AwardBadgeService.getAwardBadgeById(awardBadgeId);

    if (!awardBadge) {
      return ResponseHandler.notFound(res, "award_badge.not_found", lang);
    }

    return ResponseHandler.success(res, awardBadge, "general.success", lang);
  } catch (error) {
    logger.error("Get award-badge by id error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * Create Award/Badge
 * POST /api/v1/admin/award-badges
 *
 * Body:
 *   type        – "award" | "badge"                        (required)
 *   name        – display name, 2–200 chars                (required)
 *   contentIds  – string[]  movie/series ObjectIds         (optional)
 *   status      – "active" | "inactive", defaults "active" (optional)
 *
 * Business rules:
 *   • One award/badge can be assigned to multiple movies/series at creation.
 *   • Each supplied contentId is validated against the Content collection.
 */
export const createAwardBadge = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const adminId = req.user?.sub;

    const awardBadge = await AwardBadgeService.createAwardBadge({
      type: req.body.type,
      name: req.body.name,
      contentIds: req.body.contentIds,
      status: req.body.status,
      createdBy: adminId,
    });

    return ResponseHandler.success(
      res,
      awardBadge,
      "award_badge.created",
      lang,
      HTTP_STATUS.CREATED,
    );
  } catch (error: any) {
    logger.error("Create award-badge error:", error);
    const lang = getLanguage(req);

    // Service throws this when one or more supplied content IDs don't exist
    if (error.message === "award_badge.invalid_content_ids") {
      return ResponseHandler.validationError(
        res,
        { contentIds: "One or more content IDs are invalid or do not exist" },
        "validation.failed",
        lang,
      );
    }

    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * Update Award/Badge
 * PUT /api/v1/admin/award-badges/:awardBadgeId
 *
 * Body (all fields optional – only provided fields are updated):
 *   type       – "award" | "badge"
 *   name       – 2–200 chars
 *   contentIds – full replacement array (send [] to unassign all content)
 *   status     – "active" | "inactive"
 *
 * Business rules:
 *   • contentIds replaces the existing array wholesale.
 *   • If contentIds is omitted, existing assignments are untouched.
 *   • All supplied content IDs are validated before saving.
 */
export const updateAwardBadge = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { awardBadgeId } = req.params;
    const adminId = req.user?.sub;

    const updated = await AwardBadgeService.updateAwardBadge(awardBadgeId, {
      type: req.body.type,
      name: req.body.name,
      contentIds: req.body.contentIds,
      status: req.body.status,
      updatedBy: adminId,
    });

    if (!updated) {
      return ResponseHandler.notFound(res, "award_badge.not_found", lang);
    }

    return ResponseHandler.success(res, updated, "award_badge.updated", lang);
  } catch (error: any) {
    logger.error("Update award-badge error:", error);
    const lang = getLanguage(req);

    if (error.message === "award_badge.invalid_content_ids") {
      return ResponseHandler.validationError(
        res,
        { contentIds: "One or more content IDs are invalid or do not exist" },
        "validation.failed",
        lang,
      );
    }

    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

/**
 * Toggle Award/Badge Status
 * PATCH /api/v1/admin/award-badges/:awardBadgeId/status
 *
 * Body:
 *   status – "active" | "inactive"  (required)
 *
 * Maps to the activate/deactivate toggle in the admin listing table.
 */
export const updateAwardBadgeStatus = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { awardBadgeId } = req.params;
    const { status } = req.body;
    const adminId = req.user?.sub;

    const updated = await AwardBadgeService.updateAwardBadgeStatus(
      awardBadgeId,
      status,
      adminId,
    );

    if (!updated) {
      return ResponseHandler.notFound(res, "award_badge.not_found", lang);
    }

    return ResponseHandler.success(
      res,
      updated,
      "award_badge.status_updated",
      lang,
    );
  } catch (error) {
    logger.error("Update award-badge status error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};

export default {
  listAwardBadges,
  getAwardBadgeById,
  createAwardBadge,
  updateAwardBadge,
  updateAwardBadgeStatus,
};
