import { Request, Response } from "express";
import { ResponseHandler } from "../../../common/responses/response.handler";
import { getLanguage } from "../../shared/helpers/language.helper";
import { PaginationHelper } from "../../shared/helpers/pagination.helper";
import { SubAdminActivityHelper } from "../../shared/helpers/subadmin-activity.helper";
import { logger } from "../../../core/constants/logger";
import { HTTP_STATUS } from "../../../core/constants/app.constants";
import { JwtPayload, Role } from "../../../common/types/auth.types";
import { SlideMediaType, SlideStatus } from "../../../models/tutorial-slide.model";
import { TutorialSlideService } from "../services/tutorial-slide.service";

// ─── Typed request ────────────────────────────────────────────────────────────

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// ─── Allowed sort fields for the admin listing ────────────────────────────────

const SLIDE_SORT_FIELDS = [
  "title",
  "sequence",
  "mediaType",
  "status",
  "createdAt",
  "updatedAt",
];

// ─── Request metadata helper (mirrors CmsPageController pattern) ──────────────

/**
 * Extracts actor identity and HTTP metadata from the authenticated request.
 * Used to populate SubAdminActivity log entries.
 */
const getReqMeta = (req: AuthenticatedRequest) => ({
  actorId: req.user?.sub,
  actorRole: req.user?.role as Role | undefined,
  requestMeta: {
    method: req.method,
    path: req.originalUrl ?? req.path,
    ipAddress: (req.headers["x-forwarded-for"] as string)
      ?.split(",")[0].trim() ?? req.socket?.remoteAddress,
    userAgent: req.headers["user-agent"],
  },
});

// ─── Admin Controllers ────────────────────────────────────────────────────────

/**
 * List Tutorial Slides (Admin)
 * GET /api/v1/admin/tutorial-slides
 *
 * Query params:
 *   search    – partial title / description match
 *   mediaType – "image" | "video"
 *   status    – "active" | "inactive"
 *   fromDate  – ISO date (start of creation date range)
 *   toDate    – ISO date (end of creation date range)
 *   sortBy    – one of SLIDE_SORT_FIELDS (default: "sequence")
 *   sortOrder – "asc" | "desc"  (default: "asc")
 *   page      – page number  (default: 1)
 *   limit     – items per page (default: 10, max: 100)
 *
 * Response columns per row match the spec:
 *   title | description | mediaType | imageUrl/videoUrl | sequence | status
 */
export const listTutorialSlides = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);

    const pagination = PaginationHelper.parseParams(
      req.query,
      SLIDE_SORT_FIELDS,
    );

    // Treat "all" or empty string as undefined so we don't apply filters for them
    const mediaTypeFilter =
      req.query.mediaType === "all" || req.query.mediaType === ""
        ? undefined
        : (req.query.mediaType as SlideMediaType | undefined);

    const statusFilter =
      req.query.status === "all" || req.query.status === ""
        ? undefined
        : (req.query.status as SlideStatus | undefined);

    const filters = {
      search: req.query.search as string | undefined,
      mediaType: mediaTypeFilter,
      status: statusFilter,
      fromDate: req.query.fromDate as string | undefined,
      toDate: req.query.toDate as string | undefined,
    };

    const result = await TutorialSlideService.listSlides(pagination, filters);

    // Resolve media preview URLs for every row in the listing
    const data = result.data.map((slide: any) =>
      TutorialSlideService.formatListItem(slide),
    );

    return ResponseHandler.success(
      res,
      { ...result, data },
      "general.success",
      lang,
    );
  } catch (error) {
    logger.error("List tutorial slides error:", error);
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
 * Get Tutorial Slide by ID (Admin)
 * GET /api/v1/admin/tutorial-slides/:slideId
 *
 * Returns the full document with resolved CloudFront preview URLs.
 */
export const getTutorialSlideById = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { slideId } = req.params;

    const slide = await TutorialSlideService.getSlideById(slideId);
    if (!slide) {
      return ResponseHandler.notFound(res, "tutorial_slide.not_found", lang);
    }

    const data = TutorialSlideService.formatListItem(slide as any);

    return ResponseHandler.success(res, data, "general.success", lang);
  } catch (error) {
    logger.error("Get tutorial slide by id error:", error);
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
 * Create Tutorial Slide
 * POST /api/v1/admin/tutorial-slides
 *
 * Body:
 *   title       – slide heading, 2–200 chars            (required)
 *   description – explanatory text, 2–2000 chars        (required)
 *   mediaType   – "image" | "video"                     (required)
 *   image       – S3 key / URL (required if image)      (conditional)
 *   video       – S3 key / URL (required if video)      (conditional)
 *   sequence    – positive integer, controls order       (required)
 *   status      – "active" | "inactive", default active (optional)
 *
 * Sequence collision: if the given sequence is occupied, all slides at
 * that position and above are shifted up by 1 automatically.
 */
export const createTutorialSlide = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { actorId, actorRole, requestMeta } = getReqMeta(req);

    const slide = await TutorialSlideService.createSlide({
      title: req.body.title,
      description: req.body.description,
      mediaType: req.body.mediaType,
      image: req.body.image,
      video: req.body.video,
      sequence: req.body.sequence,
      status: req.body.status,
      createdBy: actorId,
    });

    const data = TutorialSlideService.formatListItem(slide as any);

    // ── Sub-admin activity log ────────────────────────────────────────────────
    await SubAdminActivityHelper.logActivity({
      subAdminId: actorId ?? "",
      role: actorRole ?? "",
      module: "TutorialSlide",
      action: "create",
      ...requestMeta,
      statusCode: HTTP_STATUS.CREATED,
    });

    return ResponseHandler.success(
      res,
      data,
      "tutorial_slide.created",
      lang,
      HTTP_STATUS.CREATED,
    );
  } catch (error) {
    logger.error("Create tutorial slide error:", error);
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
 * Update Tutorial Slide
 * PUT /api/v1/admin/tutorial-slides/:slideId
 *
 * Body (all fields optional – only provided fields are updated):
 *   title       – 2–200 chars
 *   description – 2–2000 chars
 *   mediaType   – "image" | "video" (triggers required check on media field)
 *   image       – S3 key / URL (required if mediaType === "image")
 *   video       – S3 key / URL (required if mediaType === "video")
 *   sequence    – positive integer; triggers automatic reorder if changed
 *   status      – "active" | "inactive"
 *
 * Send image: null or video: null to explicitly clear that media field.
 */
export const updateTutorialSlide = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { slideId } = req.params;
    const { actorId, actorRole, requestMeta } = getReqMeta(req);

    const updated = await TutorialSlideService.updateSlide(slideId, {
      title: req.body.title,
      description: req.body.description,
      mediaType: req.body.mediaType,
      image: req.body.image,
      video: req.body.video,
      sequence: req.body.sequence,
      status: req.body.status,
      updatedBy: actorId,
    });

    if (!updated) {
      return ResponseHandler.notFound(res, "tutorial_slide.not_found", lang);
    }

    const data = TutorialSlideService.formatListItem(updated as any);

    // ── Sub-admin activity log ────────────────────────────────────────────────
    await SubAdminActivityHelper.logActivity({
      subAdminId: actorId ?? "",
      role: actorRole ?? "",
      module: "TutorialSlide",
      action: "edit",
      ...requestMeta,
      statusCode: HTTP_STATUS.OK,
    });

    return ResponseHandler.success(res, data, "tutorial_slide.updated", lang);
  } catch (error) {
    logger.error("Update tutorial slide error:", error);
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
 * Toggle Tutorial Slide Status
 * PATCH /api/v1/admin/tutorial-slides/:slideId/status
 *
 * Body:
 *   status – "active" | "inactive"  (required)
 *
 * Maps to the Activate / Inactivate toggle in the admin listing table.
 * Setting a slide to "inactive" immediately hides it from the app
 * onboarding flow without requiring an app release.
 */
export const updateTutorialSlideStatus = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { slideId } = req.params;
    const { status } = req.body;
    const { actorId, actorRole, requestMeta } = getReqMeta(req);

    const updated = await TutorialSlideService.updateSlideStatus(
      slideId,
      status,
      actorId,
    );

    if (!updated) {
      return ResponseHandler.notFound(res, "tutorial_slide.not_found", lang);
    }

    const data = TutorialSlideService.formatListItem(updated as any);

    // ── Sub-admin activity log ────────────────────────────────────────────────
    await SubAdminActivityHelper.logActivity({
      subAdminId: actorId ?? "",
      role: actorRole ?? "",
      module: "TutorialSlide",
      action: "edit",
      ...requestMeta,
      statusCode: HTTP_STATUS.OK,
    });

    return ResponseHandler.success(
      res,
      data,
      "tutorial_slide.status_updated",
      lang,
    );
  } catch (error) {
    logger.error("Update tutorial slide status error:", error);
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

// ─── App-facing Controller ────────────────────────────────────────────────────

/**
 * Get Active Tutorial Slides (Public / App)
 * GET /api/v1/tutorial-slides
 *
 * Returns all ACTIVE slides sorted by sequence ascending.
 * This is the only endpoint consumed by the mobile / web app.
 * Inactive slides are automatically excluded so the admin can control
 * the onboarding flow without requiring a new app release.
 */
export const getActiveTutorialSlides = async (
  req: Request,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const slides = await TutorialSlideService.getActiveSlides();

    // Resolve media preview URLs for each slide
    const data = slides.map((slide: any) =>
      TutorialSlideService.formatListItem(slide),
    );

    return ResponseHandler.success(res, data, "general.success", lang);
  } catch (error) {
    logger.error("Get active tutorial slides error:", error);
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
 * Delete Tutorial Slide
 * DELETE /api/v1/admin/tutorial-slides/:slideId
 */
export const deleteTutorialSlide = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { slideId } = req.params;
    const { actorId, actorRole, requestMeta } = getReqMeta(req);

    await TutorialSlideService.deleteSlide(slideId);

    // ── Sub-admin activity log ────────────────────────────────────────────────
    await SubAdminActivityHelper.logActivity({
      subAdminId: actorId ?? "",
      role: actorRole ?? "",
      module: "TutorialSlide",
      action: "delete",
      ...requestMeta,
      statusCode: HTTP_STATUS.OK,
    });

    return ResponseHandler.success(
      res,
      { message: "Tutorial slide deleted successfully" },
      "tutorial_slide.deleted",
      lang,
    );
  } catch (error) {
    logger.error("Delete tutorial slide error:", error);
    const lang = getLanguage(req);

    if ((error as any).message === "tutorial_slide.not_found") {
      return ResponseHandler.notFound(res, "tutorial_slide.not_found", lang);
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
 * Normalize Tutorial Slide Sequences (Admin)
 * POST /api/v1/admin/tutorial-slides/normalize-sequences
 *
 * Repairs any gaps in active-slide sequence numbers so they are always
 * a clean 1, 2, 3 … series.  Run this once after data migrations or
 * whenever the admin sees unexpected sequence gaps.
 *
 * Safe to run multiple times (idempotent – only updates slides that need fixing).
 */
export const normalizeTutorialSlideSequences = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { actorId, actorRole, requestMeta } = getReqMeta(req);

    const updatedCount = await TutorialSlideService.normalizeActiveSequences();

    await SubAdminActivityHelper.logActivity({
      subAdminId: actorId ?? "",
      role: actorRole ?? "",
      module: "TutorialSlide",
      action: "edit",
      ...requestMeta,
      statusCode: HTTP_STATUS.OK,
    });

    return ResponseHandler.success(
      res,
      { updatedCount, message: `${updatedCount} slide(s) re-sequenced` },
      "general.success",
      lang,
    );
  } catch (error) {
    logger.error("Normalize tutorial slide sequences error:", error);
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
  listTutorialSlides,
  getTutorialSlideById,
  createTutorialSlide,
  updateTutorialSlide,
  updateTutorialSlideStatus,
  getActiveTutorialSlides,
  deleteTutorialSlide,
  normalizeTutorialSlideSequences,
};
