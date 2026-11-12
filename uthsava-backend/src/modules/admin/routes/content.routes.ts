import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import {
  listContents,
  getContentById,
  getProducerRejectedContent,
  createContent,
  updateContent,
  deleteContent,
  updateContentStatus,
  listSeasons,
  createSeason,
  getSeason,
  updateSeason,
  deleteSeason,
  listEpisodes,
  createEpisode,
  getEpisode,
  updateEpisode,
  deleteEpisode,
} from "../controllers/content.controller";
import {
  contentIdParamSchema,
  seasonIdParamSchema,
  episodeIdParamSchema,
  createContentSchema,
  updateContentSchema,
  updateContentStatusSchema,
  createSeasonSchema,
  updateSeasonSchema,
  createEpisodeSchema,
  updateEpisodeSchema,
  listContentsQuerySchema,
} from "../validators/content.validator";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../../core/middleware/validate.middleware";
import { authorize } from "../../../core/middleware/auth.middleware";
import { requireSubAdminPermission } from "../../../core/middleware/subadmin-permission.middleware";
import { Role } from "../../../common/types/auth.types";
import contentApprovalRoutes from "./content-approval.routes";

const router = Router();

// const uploadsPath = path.join(__dirname, "../../../public/uploads/content");
// fs.mkdirSync(uploadsPath, { recursive: true });

const parseJsonArrayField = <T>(value: any, fallback: T): T => {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const normalizeContentFormData = (req: any, _res: any, next: any) => {
  const body = req.body || {};


  body.type = body.type || body.contentType;
  if (typeof body.type === "string") {
    body.type = body.type.trim().toUpperCase();
  }

  body.title = body.title || body.contentTitle;

  // Handle description - keep it as is, don't overwrite
  if (!body.description) {
    body.description = body.shortDescription || "";
  }

  // Handle shortDescription - keep it as is
  if (!body.shortDescription) {
    body.shortDescription = body.description || "";
  }

  body.genres =
    body.genres ??
    parseJsonArrayField<string[]>(body.genre, [body.genre].filter(Boolean));
  if (typeof body.genres === "string") {
    body.genres = body.genres.trim().startsWith("[")
      ? parseJsonArrayField<string[]>(body.genres, [])
      : body.genres
          .split(",")
          .map((value: string) => value.trim())
          .filter(Boolean);
  }

  // Handle tags - parse JSON if string
  if (typeof body.tags === "string") {
    body.tags = body.tags.trim().startsWith("[")
      ? parseJsonArrayField<string[]>(body.tags, [])
      : body.tags
          .split(",")
          .map((tag: string) => tag.trim())
          .filter(Boolean);
  }

  // Ensure tags are uppercase for validation
  if (Array.isArray(body.tags)) {
    body.tags = body.tags.map((tag: string) =>
      String(tag).trim().toUpperCase(),
    );
  } else {
    body.tags = [];
  }

  // Handle cast - parse JSON if string
  if (typeof body.cast === "string") {
    body.cast = body.cast.trim().startsWith("[")
      ? parseJsonArrayField<string[]>(body.cast, [])
      : body.cast
          .split(",")
          .map((value: string) => value.trim())
          .filter(Boolean);
  } else if (!Array.isArray(body.cast)) {
    body.cast = [];
  }

  // Handle crew - parse JSON if string
  if (typeof body.crew === "string") {
    body.crew = body.crew.trim().startsWith("[")
      ? parseJsonArrayField<string[]>(body.crew, [])
      : body.crew
          .split(",")
          .map((value: string) => value.trim())
          .filter(Boolean);
  } else if (!Array.isArray(body.crew)) {
    body.crew = [];
  }

  // Handle language - parse JSON if string
  if (typeof body.language === "string") {
    if (body.language.trim().startsWith("[")) {
      body.language = parseJsonArrayField<string[]>(body.language, []);
    } else {
      body.language = body.language
        .split(",")
        .map((lang: string) => lang.trim())
        .filter(Boolean);
    }
  } else if (!Array.isArray(body.language)) {
    body.language = [];
  }

  // Handle teaserVideo - always convert to array
  if (typeof body.teaserVideo === "string") {
    body.teaserVideo = body.teaserVideo.trim() ? [body.teaserVideo] : [];
  } else if (body.teaserVideo === null || body.teaserVideo === undefined) {
    body.teaserVideo = [];
  }

  req.body = body;
  next();
};

/**
 * Content Management Routes
 * Base path: /api/v1/admin/contents
 *
 * Authentication + base authorization ([ADMIN, ADMIN_SUB_USER]) already applied
 * by the parent admin router.
 * Write operations are restricted to the main ADMIN role only.
 */

// ─── Presigned URL Generation ─────────────────────────────────────────────────

import Joi from "joi";
import { getVideoDuration } from "../controllers/content.controller";

// Get video duration via ffmpeg
router.post(
  "/video-duration",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER]),
  validateBody(Joi.object({ videoKey: Joi.string().required() })),
  getVideoDuration,
);

// ─── Content CRUD Operations ──────────────────────────────────────────────────

// Read operations
router.get("/", authorize([Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER]), requireSubAdminPermission("contents", "view"), validateQuery(listContentsQuerySchema), listContents);
router.get("/rejected/list", authorize([Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER]), requireSubAdminPermission("contents", "view"), validateQuery(listContentsQuerySchema), getProducerRejectedContent);
router.get("/:contentId", authorize([Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER]), requireSubAdminPermission("contents", "view"), validateParams(contentIdParamSchema), getContentById);

// Write operations
router.post(
  "/",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER]),
  requireSubAdminPermission("contents", "create"),
  // uploadContentFields,
  normalizeContentFormData,
  validateBody(createContentSchema),
  createContent,
);
router.put(
  "/:contentId",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER]),
  requireSubAdminPermission("contents", "edit"),
  normalizeContentFormData,
  validateParams(contentIdParamSchema),
  validateBody(updateContentSchema),
  updateContent,
);
router.delete(
  "/:contentId",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER]),
  requireSubAdminPermission("contents", "delete"),
  validateParams(contentIdParamSchema),
  deleteContent,
);
router.patch(
  "/:contentId/status",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER]),
  requireSubAdminPermission("contents", "edit"),
  validateParams(contentIdParamSchema),
  validateBody(updateContentStatusSchema),
  updateContentStatus,
);

// ─── Seasons (for Series content) ─────────────────────────────────────────────

// Read seasons
router.get(
  "/:contentId/seasons",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER]),
  requireSubAdminPermission("contents", "view"),
  validateParams(contentIdParamSchema),
  listSeasons,
);
router.get(
  "/:contentId/seasons/:seasonId",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER]),
  requireSubAdminPermission("contents", "view"),
  validateParams(seasonIdParamSchema),
  getSeason,
);

// Write seasons
router.post(
  "/:contentId/seasons",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER]),
  requireSubAdminPermission("contents", "create"),
  validateParams(contentIdParamSchema),
  validateBody(createSeasonSchema),
  createSeason,
);
router.put(
  "/:contentId/seasons/:seasonId",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER]),
  requireSubAdminPermission("contents", "edit"),
  validateParams(seasonIdParamSchema),
  validateBody(updateSeasonSchema),
  updateSeason,
);
router.delete(
  "/:contentId/seasons/:seasonId",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER]),
  requireSubAdminPermission("contents", "delete"),
  validateParams(seasonIdParamSchema),
  deleteSeason,
);

// ─── Episodes (for Series seasons) ────────────────────────────────────────────

// Read episodes
router.get(
  "/:contentId/seasons/:seasonId/episodes",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER]),
  requireSubAdminPermission("contents", "view"),
  validateParams(seasonIdParamSchema),
  listEpisodes,
);
router.get(
  "/:contentId/seasons/:seasonId/episodes/:episodeId",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER]),
  requireSubAdminPermission("contents", "view"),
  validateParams(episodeIdParamSchema),
  getEpisode,
);

// Write episodes
router.post(
  "/:contentId/seasons/:seasonId/episodes",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER]),
  requireSubAdminPermission("contents", "create"),
  validateParams(seasonIdParamSchema),
  validateBody(createEpisodeSchema),
  createEpisode,
);
router.put(
  "/:contentId/seasons/:seasonId/episodes/:episodeId",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER]),
  requireSubAdminPermission("contents", "edit"),
  validateParams(episodeIdParamSchema),
  validateBody(updateEpisodeSchema),
  updateEpisode,
);
router.delete(
  "/:contentId/seasons/:seasonId/episodes/:episodeId",
  authorize([Role.ADMIN, Role.ADMIN_SUB_USER, Role.PRODUCER]),
  requireSubAdminPermission("contents", "delete"),
  validateParams(episodeIdParamSchema),
  deleteEpisode,
);

// ─── Content Approval Routes ──────────────────────────────────────────────────

router.use("/", contentApprovalRoutes);

export default router;
