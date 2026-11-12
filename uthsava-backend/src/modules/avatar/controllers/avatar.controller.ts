import { Request, Response } from "express";
import { ResponseHandler } from "../../../common/responses/response.handler";
import { getLanguage } from "../../shared/helpers/language.helper";
import { PaginationHelper } from "../../shared/helpers/pagination.helper";
import { SubAdminActivityHelper } from "../../shared/helpers/subadmin-activity.helper";
import { logger } from "../../../core/constants/logger";
import { HTTP_STATUS } from "../../../core/constants/app.constants";
import { AvatarService } from "../services/avatar.service";
import { JwtPayload, Role } from "../../../common/types/auth.types";
import { AvatarStatus } from "../../../models/avatar.model";

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

const AVATAR_SORT_FIELDS = ["category", "isKids", "status", "createdAt", "updatedAt"];

/**
 * Safely parses boolean query parameters, handling both raw strings ('true', '1')
 * and Joi-validated booleans (true, false).
 */
const parseBooleanQueryParam = (val: any): boolean | undefined => {
  if (val === undefined || val === null || val === "" || val === "all") return undefined;
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val === 1;
  if (typeof val === "string") {
    const lower = val.trim().toLowerCase();
    if (lower === "true" || lower === "1") return true;
    if (lower === "false" || lower === "0") return false;
  }
  return undefined;
};

/**
 * Extracts actor identity and HTTP metadata from request for SubAdminActivity logging.
 */
const getReqMeta = (req: AuthenticatedRequest) => ({
  actorId: req.user?._id,
  actorRole: req.user?.role as Role | undefined,
  requestMeta: {
    method: req.method,
    path: req.originalUrl ?? req.path,
    ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ?? req.socket?.remoteAddress,
    userAgent: req.headers["user-agent"],
  },
});

/**
 * GET /api/v1/avatars
 *
 * Mobile / TV / Web app endpoint to list active avatars grouped by category.
 * Query Params:
 *  - iskids / isKids (boolean): Filter for Kids avatars (?iskids=true) vs Standard/Adult (?iskids=false)
 *  - category (string): Optional category name filter
 */
export const getActiveAvatars = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);

    // Support `iskids`, `isKids`, and `kids` query params
    const rawKids = req.query.iskids ?? req.query.isKids ?? req.query.kids;
    const isKidsFilter = parseBooleanQueryParam(rawKids);

    const categoryFilter = req.query.category as string | undefined;

    const page = Math.max(1, Number.parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit as string) || 10));

    const data = await AvatarService.getActiveAvatars(isKidsFilter, categoryFilter, page, limit);

    return ResponseHandler.success(res, data, "general.success", lang);
  } catch (error) {
    logger.error("[AvatarController] Get active avatars error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * GET /api/v1/avatars/active-categories
 * GET /api/v1/avatars/active
 *
 * Mobile GET API to retrieve active avatar categories & avatar image list.
 * Query Params:
 *  - iskids / isKids (boolean): Filter for Kids avatars (?iskids=true) vs Standard/Adult (?iskids=false)
 *  - category (string): Optional category name filter
 *  - page (number): Page number (default: 1)
 *  - limit (number): Limit per page (default: 10)
 */
export const getActiveAvatarCategoriesMobile = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);

    const rawKids = req.query.iskids ?? req.query.isKids ?? req.query.kids;
    const isKidsFilter = parseBooleanQueryParam(rawKids);

    const categoryFilter = req.query.category as string | undefined;

    const page = Math.max(1, Number.parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit as string) || 10));

    const data = await AvatarService.getActiveAvatars(isKidsFilter, categoryFilter, page, limit);

    return ResponseHandler.success(res, data, "avatar_category.listed", lang);
  } catch (error) {
    logger.error("[AvatarController] Get active avatar categories mobile error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * POST /api/v1/avatars (legacy/public create)
 */
export const createAvatar = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lang = getLanguage(req);
    const userId = req.user?._id;

    const result = await AvatarService.createAvatar(req.body, userId);

    return ResponseHandler.success(
      res,
      result,
      "general.success",
      lang,
      HTTP_STATUS.CREATED
    );
  } catch (error: any) {
    logger.error("[AvatarController] Create avatar error:", error);
    const lang = getLanguage(req);
    if (error?.message?.includes("10") || error?.message?.startsWith("validation.")) {
      return ResponseHandler.badRequest(res, error.message, lang);
    }
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * GET /api/v1/admin/avatars
 *
 * Admin Listing API with pagination, search, isKids filter, status filter, and sorting.
 */
export const listAdminAvatars = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lang = getLanguage(req);

    const pagination = PaginationHelper.parseParams(req.query, AVATAR_SORT_FIELDS);

    const isKidsFilter = parseBooleanQueryParam(req.query.isKids ?? req.query.iskids);

    const statusFilter =
      req.query.status === "all" || req.query.status === ""
        ? undefined
        : (req.query.status as AvatarStatus | undefined);

    const filters = {
      search: req.query.search as string | undefined,
      isKids: isKidsFilter,
      status: statusFilter,
      fromDate: req.query.fromDate as string | undefined,
      toDate: req.query.toDate as string | undefined,
    };

    const result = await AvatarService.listAdminAvatars(pagination, filters);

    return ResponseHandler.success(res, result, "general.success", lang);
  } catch (error) {
    logger.error("[AvatarController] List admin avatars error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * GET /api/v1/admin/avatars/:avatarId
 */
export const getAvatarById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { avatarId } = req.params;

    const avatar = await AvatarService.getAvatarById(avatarId);
    if (!avatar) {
      return ResponseHandler.notFound(res, "Avatar category not found", lang);
    }

    return ResponseHandler.success(res, avatar, "general.success", lang);
  } catch (error) {
    logger.error("[AvatarController] Get avatar by ID error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * POST /api/v1/admin/avatars
 */
export const createAdminAvatar = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { actorId, actorRole, requestMeta } = getReqMeta(req);

    const avatar = await AvatarService.createAvatar(req.body, actorId);

    await SubAdminActivityHelper.logActivity({
      subAdminId: actorId ?? "",
      role: actorRole ?? "",
      module: "Avatar",
      action: "create",
      ...requestMeta,
      statusCode: HTTP_STATUS.CREATED,
    });

    return ResponseHandler.success(
      res,
      avatar,
      "Avatar category created successfully",
      lang,
      HTTP_STATUS.CREATED
    );
  } catch (error: any) {
    logger.error("[AvatarController] Create admin avatar error:", error);
    const lang = getLanguage(req);
    if (error?.message?.includes("10") || error?.message?.startsWith("validation.")) {
      return ResponseHandler.badRequest(res, error.message, lang);
    }
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * PUT /api/v1/admin/avatars/:avatarId
 */
export const updateAdminAvatar = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { avatarId } = req.params;
    const { actorId, actorRole, requestMeta } = getReqMeta(req);

    const updated = await AvatarService.updateAvatar(avatarId, req.body, actorId);
    if (!updated) {
      return ResponseHandler.notFound(res, "Avatar category not found", lang);
    }

    await SubAdminActivityHelper.logActivity({
      subAdminId: actorId ?? "",
      role: actorRole ?? "",
      module: "Avatar",
      action: "edit",
      ...requestMeta,
      statusCode: HTTP_STATUS.OK,
    });

    return ResponseHandler.success(res, updated, "Avatar category updated successfully", lang);
  } catch (error: any) {
    logger.error("[AvatarController] Update admin avatar error:", error);
    const lang = getLanguage(req);
    if (error?.message?.includes("10") || error?.message?.startsWith("validation.")) {
      return ResponseHandler.badRequest(res, error.message, lang);
    }
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * PATCH /api/v1/admin/avatars/:avatarId/status
 */
export const updateAdminAvatarStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { avatarId } = req.params;
    const { status } = req.body;
    const { actorId, actorRole, requestMeta } = getReqMeta(req);

    const updated = await AvatarService.updateAvatarStatus(avatarId, status, actorId);
    if (!updated) {
      return ResponseHandler.notFound(res, "Avatar category not found", lang);
    }

    await SubAdminActivityHelper.logActivity({
      subAdminId: actorId ?? "",
      role: actorRole ?? "",
      module: "Avatar",
      action: "edit",
      ...requestMeta,
      statusCode: HTTP_STATUS.OK,
    });

    return ResponseHandler.success(res, updated, "Avatar status updated successfully", lang);
  } catch (error) {
    logger.error("[AvatarController] Update admin avatar status error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * DELETE /api/v1/admin/avatars/:avatarId
 */
export const deleteAdminAvatar = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { avatarId } = req.params;
    const { actorId, actorRole, requestMeta } = getReqMeta(req);

    const deleted = await AvatarService.deleteAvatar(avatarId);
    if (!deleted) {
      return ResponseHandler.notFound(res, "Avatar category not found", lang);
    }

    await SubAdminActivityHelper.logActivity({
      subAdminId: actorId ?? "",
      role: actorRole ?? "",
      module: "Avatar",
      action: "delete",
      ...requestMeta,
      statusCode: HTTP_STATUS.OK,
    });

    return ResponseHandler.success(
      res,
      { message: "Avatar category deleted successfully" },
      "Avatar category deleted successfully",
      lang
    );
  } catch (error) {
    logger.error("[AvatarController] Delete admin avatar error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * GET /api/v1/admin/avatars/categories
 * GET /api/v1/avatars/categories
 * List all available avatar categories for dropdown selection.
 */
export const listAvatarCategories = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const categories = await AvatarService.listAvatarCategories();
    return ResponseHandler.success(
      res,
      {
        totalCategories: categories.length,
        categories,
      },
      "avatar_category.listed",
      lang
    );
  } catch (error) {
    logger.error("[AvatarController] List avatar categories error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

/**
 * POST /api/v1/admin/avatars/categories
 * Create a new Avatar Category.
 */
export const createAvatarCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { actorId, actorRole, requestMeta } = getReqMeta(req);

    const category = await AvatarService.createAvatarCategory(req.body, actorId);

    if (actorId && actorRole) {
      await SubAdminActivityHelper.logActivity({
        subAdminId: actorId,
        role: actorRole,
        action: "create",
        module: "AvatarCategory",
        ...requestMeta,
        statusCode: HTTP_STATUS.CREATED,
      });
    }

    return ResponseHandler.success(
      res,
      category,
      "avatar_category.created",
      lang,
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    logger.error("[AvatarController] Create avatar category error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error
    );
  }
};

export default {
  getActiveAvatars,
  getActiveAvatarCategoriesMobile,
  createAvatar,
  listAdminAvatars,
  getAvatarById,
  createAdminAvatar,
  updateAdminAvatar,
  updateAdminAvatarStatus,
  deleteAdminAvatar,
  listAvatarCategories,
  createAvatarCategory,
};
