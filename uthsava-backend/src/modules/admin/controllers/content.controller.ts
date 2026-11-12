import { Request, Response } from "express";
import { ContentService, ERROR_MESSAGES } from "../services/content.service";
import { ResponseHandler } from "../../../common/responses/response.handler";
import { getLanguage } from "../../shared/helpers/language.helper";
import { PaginationHelper } from "../../shared/helpers/pagination.helper";
import { QueryBuilder } from "../../shared/helpers/query-builder.helper";
import { logger } from "../../../core/constants/logger";
import { HTTP_STATUS } from "../../../core/constants/app.constants";
import { ContentStatus, ContentApprovalStatus } from "../../../models/content.model";
import ffmpeg from "fluent-ffmpeg";
import ffprobe from "@ffprobe-installer/ffprobe";
import { AuditLogService } from "../services/audit-log.service";
import { AuditModule } from "../../../models/audit-log.model";
import { Types } from "mongoose";

if (ffprobe && ffprobe.path) {
  try {
    ffmpeg.setFfprobePath(ffprobe.path);
  } catch (e) {
    logger.warn("Could not set ffprobe path:", e);
  }
}

/**
 * GET /api/v1/admin/contents
 * Paginated, searchable, filterable content list
 */
export const listContents = async (req: Request, res: Response) => {
  try {
    // Disable caching for dynamic content list endpoint
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    
    const lang = getLanguage(req);
    const {
      search,
      type,
      contentType,
      status,
      tag,
      categoryId,
      language,
      cast,
      crew,
      isActive,
      startDate,
      endDate,
      genre,
      releaseYear,
      uploadedBy,
    } = req.query;

    const pagination = PaginationHelper.parseParams(req.query, [
      "title",
      "type",
      "status",
      "language",
      "releaseYear",
      "isActive",
      "createdAt",
      "updatedAt",
    ]);

    const query = QueryBuilder.buildListingQuery({
      search: search as string,
      searchFields: [
        "title",
        "shortDescription",
        "description",
        "description",
        "cast.name",
        "crew.name",
        "tags",
      ],
      startDate: startDate as string,
      endDate: endDate as string,
      dateField: "createdAt",
    });

    // Filter by producer if the logged-in user has a producer role
    // Producers should see their own uploaded contents OR all admin-uploaded contents
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.sub || (req as any).user?.id;
    if (userRole === "producer" && userId) {
      const producerId = new Types.ObjectId(userId);
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { uploadedBy: producerId },
          { uploadedByType: "ADMIN" }
        ]
      });
    }

    // Add specific filters
    if (uploadedBy) {
      query.uploadedBy = uploadedBy;
    }
    const targetType = (type || contentType) as string;
    if (targetType && targetType !== "all") {
      query.type = targetType.toUpperCase();
    }
    if (cast) {
      query["cast.name"] = { $regex: cast as string, $options: "i" };
    }
    if (status && status !== "all") {
      const upperStatus = (status as string).toUpperCase();
      if (Object.values(ContentStatus).includes(upperStatus as any)) {
        query.status = upperStatus;
      } else if (Object.values(ContentApprovalStatus).includes(upperStatus as any)) {
        query.approvalStatus = upperStatus;
      } else {
        query.status = upperStatus; // Fallback
      }
    }

    if (tag) {
      // Support partial tag matching with regex on array elements
      query.tags = {
        $elemMatch: {
          $regex: tag as string,
          $options: "i"
        }
      };
    }
    if (categoryId) {
      query.genreIds = categoryId;
    }
    // Filter by Genre
    if (genre) {
      query.genreIds = genre;
    }

    // Filter by Language
    if (language) {
      query.languageIds = language;
    }

    // Filter by Release Year
    if (releaseYear) {
      query.releaseYear = Number(releaseYear);
    }

    if (crew) {
      query["crew.name"] = { $regex: crew as string, $options: "i" };
    }

    if (isActive && isActive !== "all") {
      if (isActive === "true") {
        query.isActive = true;
      } else {
        query.$and = query.$and || [];
        query.$and.push({
          $or: [{ isActive: false }, { isActive: { $exists: false } }, { isActive: null }]
        });
      }
    }

    const result = await ContentService.listContents(pagination, query);

    return ResponseHandler.success(
      res,
      {
        ...result,
        filters: {
          search,
          type,
          status,
          categoryId,
          genre,
          language,
          isActive,
          startDate,
          endDate,
          releaseYear,
        },
      },
      "content.listed",
      lang,
    );
  } catch (error: any) {
    logger.error("List contents error:", error);
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

// ─── Get by ID ────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/contents/:contentId
 * Get content with full details
 */
export const getContentById = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { contentId } = req.params;

    const content = await ContentService.getContentById(contentId);
    return ResponseHandler.success(
      res,
      { content: ContentService.sanitizeContent(content) },
      "content.retrieved",
      lang,
    );
  } catch (error: any) {
    logger.error("Get content by ID error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.CONTENT_NOT_FOUND) {
      return ResponseHandler.error(
        res,
        "content.not_found",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    if (error.message.includes("Invalid")) {
      return ResponseHandler.validationError(
        res,
        { contentId: error.message },
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

// ─── Get Rejected Content for Producer ─────────────────────────────────────────

/**
 * GET /api/v1/admin/contents/rejected/list
 * Get rejected content for logged-in producer
 * Producer can see their own rejected content
 */
export const getProducerRejectedContent = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const userId = (req as any).user?.sub || (req as any).user?.id;
    if (!userId) {
      return ResponseHandler.unauthorized(res, "auth.unauthorized", lang);
    }

    const pagination = PaginationHelper.parseParams(req.query, [
      "title",
      "rejectionDate",
      "createdAt",
    ]);

    const { search } = req.query;

    // Build query to get rejected content for this producer
    const query: any = {
      uploadedBy: new Types.ObjectId(userId),
      approvalStatus: "REJECTED",
    };

    if (search) {
      query.$or = [
        { title: { $regex: search as string, $options: "i" } },
        { shortDescription: { $regex: search as string, $options: "i" } },
        { rejectionReason: { $regex: search as string, $options: "i" } },
      ];
    }

    const result = await ContentService.listContents(pagination, query);

    return ResponseHandler.success(
      res,
      result,
      "content.listed",
      lang,
    );
  } catch (error: any) {
    logger.error("Get rejected content error:", error);
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
 * POST /api/v1/admin/contents
 * Create new content
 */
export const createContent = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const uploadedById = (req as any).user?._id || (req as any).user?.sub || (req as any).user?.id;
    const uploadedByRole = (req as any).user?.role;

    // Automatically calculate movie duration via ffmpeg if not provided
    const body = req.body || {};
    const videoKey = body.mainVideo || body.mainVideoFile;
    if (body.type === "MOVIE" && (!body.duration || body.duration <= 0) && videoKey) {
      try {
        const videoUrl = videoKey.startsWith("http")
          ? videoKey
          : `${process.env.AWS_CLOUDFRONT_URL || process.env.AWS_MEDIA_URL || "https://d1f23llskj06r6.cloudfront.net"}/${videoKey}`;

        const durationInSeconds = await new Promise<number>((resolve, reject) => {
          ffmpeg.ffprobe(videoUrl, (err: any, metadata: any) => {
            if (err) {
              reject(err);
            } else {
              resolve(metadata.format?.duration || 0);
            }
          });
        });
        if (durationInSeconds > 0) {
          body.duration = Math.round(durationInSeconds / 60) || 1; // convert to minutes, fallback to 1
        }
      } catch (err) {
        logger.error("Failed to automatically calculate movie duration:", err);
      }
    }

    const content = await ContentService.createContent(body, uploadedById, uploadedByRole);

    if ((req as any).user) {
      await AuditLogService.logAction({
        adminId: (req as any).user.sub,
        module: AuditModule.CONTENT,
        action: "Create Content",
        entityId: content._id as Types.ObjectId,
        newData: req.body,
        req,
      });
    }
    return ResponseHandler.success(
      res,
      { content: ContentService.sanitizeContent(content) },
      "content.created",
      lang,
      HTTP_STATUS.CREATED,
    );
  } catch (error: any) {
    logger.error("Create content error:", error);
    const lang = getLanguage(req);

    if (error.message.includes("Invalid")) {
      return ResponseHandler.validationError(
        res,
        { content: error.message },
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
 * PUT /api/v1/admin/contents/:contentId
 * Update content
 */
export const updateContent = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { contentId } = req.params;

    // Allow content to be updated regardless of its approval status (e.g. pending or approved) by any authorized user.

    const content = await ContentService.updateContent(contentId, req.body);

    if ((req as any).user) {
      await AuditLogService.logAction({
        adminId: (req as any).user.sub,
        module: AuditModule.CONTENT,
        action: "Update Content",
        entityId: contentId,
        newData: req.body,
        req,
      });
    }

    return ResponseHandler.success(
      res,
      { content: ContentService.sanitizeContent(content) },
      "content.updated",
      lang,
    );
  } catch (error: any) {
    logger.error("Update content error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.CONTENT_NOT_FOUND) {
      return ResponseHandler.error(
        res,
        "content.not_found",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    if (error.message.includes("Invalid")) {
      return ResponseHandler.validationError(
        res,
        { contentId: error.message },
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
 * DELETE /api/v1/admin/contents/:contentId
 * Delete content
 */
export const deleteContent = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { contentId } = req.params;

    await ContentService.deleteContent(contentId);

    if ((req as any).user) {
      await AuditLogService.logAction({
        adminId: (req as any).user.sub,
        module: AuditModule.CONTENT,
        action: "Delete Content",
        entityId: contentId,
        req,
      });
    }

    return ResponseHandler.success(
      res,
      { message: "Content deleted successfully" },
      "content.deleted",
      lang,
    );
  } catch (error: any) {
    logger.error("Delete content error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.CONTENT_NOT_FOUND) {
      return ResponseHandler.error(
        res,
        "content.not_found",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    if (error.message.includes("Invalid")) {
      return ResponseHandler.validationError(
        res,
        { contentId: error.message },
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
 * PATCH /api/v1/admin/contents/:contentId/status
 * Update content active/inactive status
 */
export const updateContentStatus = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { contentId } = req.params;
    const { status, isActive: isActiveBody, approvalStatus } = req.body;
    const isActive =
      isActiveBody !== undefined
        ? isActiveBody === true
        : status === "ACTIVE" || status === "PUBLISHED";

    const content = await ContentService.updateContentStatus(
      contentId,
      isActive,
      status,
      approvalStatus,
    );

    if ((req as any).user) {
      await AuditLogService.logAction({
        adminId: (req as any).user.sub,
        module: AuditModule.CONTENT,
        action: "Update Content Status",
        entityId: contentId,
        newData: { status, isActive },
        req,
      });
    }

    return ResponseHandler.success(
      res,
      { content: ContentService.sanitizeContent(content) },
      "content.status_updated",
      lang,
    );
  } catch (error: any) {
    logger.error("Update content status error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.CONTENT_NOT_FOUND) {
      return ResponseHandler.error(
        res,
        "content.not_found",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    if (error.message.includes("Invalid")) {
      return ResponseHandler.validationError(
        res,
        { contentId: error.message },
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
 * GET /api/v1/admin/contents/:contentId/seasons
 * List all seasons for a series
 */
export const listSeasons = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { contentId } = req.params;

    const seasons = await ContentService.listSeasons(contentId);

    return ResponseHandler.success(res, { seasons }, "seasons.listed", lang);
  } catch (error: any) {
    logger.error("List seasons error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.CONTENT_NOT_FOUND) {
      return ResponseHandler.error(
        res,
        "content.not_found",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    if (error.message === ERROR_MESSAGES.ONLY_SERIES_CAN_HAVE_SEASONS) {
      return ResponseHandler.error(
        res,
        "error.only_series_can_have_seasons",
        lang,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    if (error.message.includes("Invalid")) {
      return ResponseHandler.validationError(
        res,
        { contentId: error.message },
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
 * POST /api/v1/admin/contents/:contentId/seasons
 * Create a new season for a series
 */
export const createSeason = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { contentId } = req.params;

    const season = await ContentService.createSeason(contentId, req.body);

    return ResponseHandler.success(
      res,
      { season },
      "season.created",
      lang,
      HTTP_STATUS.CREATED,
    );
  } catch (error: any) {
    logger.error("Create season error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.CONTENT_NOT_FOUND) {
      return ResponseHandler.error(
        res,
        "content.not_found",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    if (error.message === ERROR_MESSAGES.ONLY_SERIES_CAN_HAVE_SEASONS) {
      return ResponseHandler.error(
        res,
        "error.only_series_can_have_seasons",
        lang,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    if (error.message === ERROR_MESSAGES.SEASON_EXISTS) {
      return ResponseHandler.validationError(
        res,
        { seasonNumber: "Season with this number already exists" },
        "validation.failed",
        lang,
      );
    }

    if (error.message.includes("Invalid")) {
      return ResponseHandler.validationError(
        res,
        { contentId: error.message },
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
 * GET /api/v1/admin/contents/:contentId/seasons/:seasonId
 * Get a specific season
 */
export const getSeason = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { contentId, seasonId } = req.params;

    const season = await ContentService.getSeasonById(contentId, seasonId);

    return ResponseHandler.success(res, { season }, "season.retrieved", lang);
  } catch (error: any) {
    logger.error("Get season error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.SEASON_NOT_FOUND) {
      return ResponseHandler.error(
        res,
        "season.not_found",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    if (error.message.includes("Invalid")) {
      return ResponseHandler.validationError(
        res,
        { seasonId: error.message },
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
 * PUT /api/v1/admin/contents/:contentId/seasons/:seasonId
 * Update a season
 */
export const updateSeason = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { contentId, seasonId } = req.params;

    const season = await ContentService.updateSeason(
      contentId,
      seasonId,
      req.body,
    );

    return ResponseHandler.success(res, { season }, "season.updated", lang);
  } catch (error: any) {
    logger.error("Update season error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.SEASON_NOT_FOUND) {
      return ResponseHandler.error(
        res,
        "season.not_found",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    if (error.message === ERROR_MESSAGES.SEASON_EXISTS) {
      return ResponseHandler.validationError(
        res,
        { seasonNumber: "Season with this number already exists" },
        "validation.failed",
        lang,
      );
    }

    if (error.message.includes("Invalid")) {
      return ResponseHandler.validationError(
        res,
        { seasonId: error.message },
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
 * DELETE /api/v1/admin/contents/:contentId/seasons/:seasonId
 * Delete a season and its episodes
 */
export const deleteSeason = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { contentId, seasonId } = req.params;

    await ContentService.deleteSeason(contentId, seasonId);

    return ResponseHandler.success(
      res,
      { message: "Season deleted successfully" },
      "season.deleted",
      lang,
    );
  } catch (error: any) {
    logger.error("Delete season error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.SEASON_NOT_FOUND) {
      return ResponseHandler.error(
        res,
        "season.not_found",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    if (error.message.includes("Invalid")) {
      return ResponseHandler.validationError(
        res,
        { seasonId: error.message },
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
 * GET /api/v1/admin/contents/:contentId/seasons/:seasonId/episodes
 * List all episodes for a season
 */
export const listEpisodes = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { contentId, seasonId } = req.params;

    const episodes = await ContentService.listEpisodes(contentId, seasonId);

    return ResponseHandler.success(res, { episodes }, "episodes.listed", lang);
  } catch (error: any) {
    logger.error("List episodes error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.SEASON_NOT_FOUND) {
      return ResponseHandler.error(
        res,
        "season.not_found",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    if (error.message.includes("Invalid")) {
      return ResponseHandler.validationError(
        res,
        { seasonId: error.message },
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
 * POST /api/v1/admin/contents/:contentId/seasons/:seasonId/episodes
 * Create a new episode for a season
 */
export const createEpisode = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { contentId, seasonId } = req.params;

    const body = req.body;

    // Automatically fetch duration if not provided
    if (!body.duration && body.videoFile) {
      try {
        const videoUrl = body.videoFile.startsWith("http")
          ? body.videoFile
          : `${process.env.AWS_CLOUDFRONT_URL || process.env.AWS_MEDIA_URL}/${body.videoFile}`;

        const durationInSeconds = await new Promise<number>((resolve) => {
          const timer = setTimeout(() => resolve(60), 3000);
          try {
            ffmpeg.ffprobe(videoUrl, (err: any, metadata: any) => {
              clearTimeout(timer);
              if (err || !metadata?.format?.duration) {
                resolve(60);
              } else {
                resolve(Number(metadata.format.duration) || 60);
              }
            });
          } catch {
            clearTimeout(timer);
            resolve(60);
          }
        });

        body.duration = Math.max(1, Math.ceil(durationInSeconds / 60));
      } catch (err) {
        logger.error("Failed to automatically fetch duration for episode:", err);
        body.duration = 1;
      }
    }

    const episode = await ContentService.createEpisode(
      contentId,
      seasonId,
      body,
    );

    return ResponseHandler.success(
      res,
      { episode },
      "episode.created",
      lang,
      HTTP_STATUS.CREATED,
    );
  } catch (error: any) {
    logger.error("Create episode error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.SEASON_NOT_FOUND) {
      return ResponseHandler.error(
        res,
        "season.not_found",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    if (error.message === ERROR_MESSAGES.EPISODE_EXISTS) {
      return ResponseHandler.validationError(
        res,
        { episodeNumber: "Episode with this number already exists" },
        "validation.failed",
        lang,
      );
    }

    if (error.message.includes("Invalid")) {
      return ResponseHandler.validationError(
        res,
        { seasonId: error.message },
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
 * GET /api/v1/admin/contents/:contentId/seasons/:seasonId/episodes/:episodeId
 * Get a specific episode
 */
export const getEpisode = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { contentId, seasonId, episodeId } = req.params;

    const episode = await ContentService.getEpisodeById(
      contentId,
      seasonId,
      episodeId,
    );

    return ResponseHandler.success(res, { episode }, "episode.retrieved", lang);
  } catch (error: any) {
    logger.error("Get episode error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.EPISODE_NOT_FOUND) {
      return ResponseHandler.error(
        res,
        "episode.not_found",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    if (error.message.includes("Invalid")) {
      return ResponseHandler.validationError(
        res,
        { episodeId: error.message },
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
 * PUT /api/v1/admin/contents/:contentId/seasons/:seasonId/episodes/:episodeId
 * Update an episode
 */
export const updateEpisode = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { contentId, seasonId, episodeId } = req.params;

    const body = req.body;

    // Automatically fetch duration if not provided but video file is being updated
    if (!body.duration && body.videoFile) {
      try {
        const videoUrl = body.videoFile.startsWith("http")
          ? body.videoFile
          : `${process.env.AWS_CLOUDFRONT_URL || process.env.AWS_MEDIA_URL}/${body.videoFile}`;

        const durationInSeconds = await new Promise<number>((resolve, reject) => {
          ffmpeg.ffprobe(videoUrl, (err: any, metadata: any) => {
            if (err) {
              reject(err);
            } else {
              resolve(metadata.format.duration);
            }
          });
        });

        // Convert to minutes, minimum 1 minute as per schema
        body.duration = Math.max(1, Math.ceil(durationInSeconds / 60));
      } catch (err) {
        logger.error("Failed to automatically fetch duration for episode update:", err);
      }
    }

    const episode = await ContentService.updateEpisode(
      contentId,
      seasonId,
      episodeId,
      body,
    );

    return ResponseHandler.success(res, { episode }, "episode.updated", lang);
  } catch (error: any) {
    logger.error("Update episode error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.EPISODE_NOT_FOUND) {
      return ResponseHandler.error(
        res,
        "episode.not_found",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    if (error.message === ERROR_MESSAGES.EPISODE_EXISTS) {
      return ResponseHandler.validationError(
        res,
        { episodeNumber: "Episode with this number already exists" },
        "validation.failed",
        lang,
      );
    }

    if (error.message.includes("Invalid")) {
      return ResponseHandler.validationError(
        res,
        { episodeId: error.message },
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
 * DELETE /api/v1/admin/contents/:contentId/seasons/:seasonId/episodes/:episodeId
 * Delete an episode
 */
export const deleteEpisode = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { contentId, seasonId, episodeId } = req.params;

    await ContentService.deleteEpisode(contentId, seasonId, episodeId);

    return ResponseHandler.success(
      res,
      { message: "Episode deleted successfully" },
      "episode.deleted",
      lang,
    );
  } catch (error: any) {
    logger.error("Delete episode error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.EPISODE_NOT_FOUND) {
      return ResponseHandler.error(
        res,
        "episode.not_found",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    if (error.message.includes("Invalid")) {
      return ResponseHandler.validationError(
        res,
        { episodeId: error.message },
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

// Set the ffprobe path from the installer package or from environment variable
const ffprobePath = process.env.FFPROBE_PATH || ffprobe.path || "/usr/bin/ffprobe";
ffmpeg.setFfprobePath(ffprobePath);

/**
 * POST /api/v1/admin/contents/video-duration
 * Extract video duration using ffprobe
 */
export const getVideoDuration = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { videoKey } = req.body;

    if (!videoKey) {
      return ResponseHandler.validationError(
        res,
        { videoKey: "Video key is required" },
        "validation.failed",
        lang,
      );
    }

    const videoUrl = videoKey.startsWith("http")
      ? videoKey
      : `${process.env.AWS_CLOUDFRONT_URL || process.env.AWS_MEDIA_URL}/${videoKey}`;

    const duration = await new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(videoUrl, (err: any, metadata: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata.format.duration);
        }
      });
    });

    return ResponseHandler.success(
      res,
      { duration },
      "duration.fetched",
      lang,
    );
  } catch (error: any) {
    logger.error("Get video duration error:", error);
    const lang = getLanguage(req);

    // Handle ffprobe permission errors
    if (error.code === "EACCES") {
      return ResponseHandler.error(
        res,
        "content.ffprobe_permission_error",
        lang,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        error,
      );
    }

    // Handle network/connection errors
    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      return ResponseHandler.error(
        res,
        "content.video_url_not_accessible",
        lang,
        HTTP_STATUS.BAD_REQUEST,
        error,
      );
    }

    // Handle timeout errors
    if (error.code === "ETIMEDOUT") {
      return ResponseHandler.error(
        res,
        "content.video_duration_timeout",
        lang,
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        error,
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
