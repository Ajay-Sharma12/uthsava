import { Request, Response } from "express";
import { CmsPageService } from "../services/cms-page.service";
import { ResponseHandler } from "../../../common/responses/response.handler";
import { getLanguage } from "../../shared/helpers/language.helper";
import { PaginationHelper } from "../../shared/helpers/pagination.helper";
import { QueryBuilder } from "../../shared/helpers/query-builder.helper";
import { CmsPage, PublicationStatus } from "../../../models";
import { logger } from "../../../core/constants/logger";
import { HTTP_STATUS } from "../../../core/constants/app.constants";
import { JwtPayload, Role } from "../../../common/types/auth.types";
import { SubAdminActivityHelper } from "../../shared/helpers/subadmin-activity.helper";

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/** Extract actor identity + HTTP metadata from the request */
const getReqMeta = (req: AuthenticatedRequest) => ({
  actorId: req.user?.sub,
  actorRole: req.user?.role as Role | undefined,
  requestMeta: {
    method: req.method,
    path: req.originalUrl ?? req.path,
    ipAddress:
      (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ??
      req.socket?.remoteAddress,
    userAgent: req.headers["user-agent"],
  },
});

const CMS_SORT_FIELDS = ["createdAt", "updatedAt", "title", "slug", "status"];
const CMS_SEARCH_FIELDS = ["title", "content"];

/**
 * Create CMS Page Controller
 */
export const createCmsPage = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { actorId, actorRole, requestMeta } = getReqMeta(req);

    const page = await CmsPageService.createPage(req.body, actorId);

    // ── Sub-admin activity log ────────────────────────────────────────────────
    await SubAdminActivityHelper.logActivity({
      subAdminId: actorId ?? "",
      role: actorRole ?? "",
      module: "CmsPage",
      action: "create",
      ...requestMeta,
      statusCode: HTTP_STATUS.CREATED,
    });

    return ResponseHandler.success(
      res,
      page,
      "cms.pageCreated",
      lang,
      HTTP_STATUS.CREATED,
    );
  } catch (error: any) {
    logger.error("Create CMS page error:", error);
    const lang = getLanguage(req);

    if (error.code === 11000) {
      return ResponseHandler.validationError(
        res,
        { slug: "Slug already exists" },
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
 * Helper to format populated user fields with associated action timestamps.
 * Converts populated User objects into a structured { name, date } format.
 * Returns null if the user field is empty or could not be populated.
 */
const formatUserWithDate = (userField: any, dateField: any) => {
  if (!userField) return null;
  // If the user field was successfully populated, it will contain an _id
  if (typeof userField === "object" && userField._id) {
    return {
      name:
        userField.fullName ||
        [userField.firstName, userField.lastName].filter(Boolean).join(" ") ||
        "Unknown",
      date: dateField || null,
    };
  }
  return null;
};

/**
 * List CMS Pages Controller
 */
export const listCmsPages = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);

    // Parse pagination parameters
    const paginationParams = PaginationHelper.parseParams(
      req.query,
      CMS_SORT_FIELDS,
    );

    // Handle both 'status' and 'publicationStatus' query parameters
    const statusParam = (req.query.status || req.query.publicationStatus) as string;

    // Build query - exclude deleted pages by default
    const query: any = {
      status: { $ne: "deleted" } // Exclude deleted pages
    };

    // Add search if provided
    if (req.query.search && req.query.search !== "") {
      const searchRegex = { $regex: req.query.search, $options: "i" };
      query.$or = [
        { title: searchRegex },
        { content: searchRegex }
      ];
    }

    // Apply status filter if provided and not "all"
    if (statusParam && statusParam !== "all" && statusParam !== "") {
      query.status = statusParam;
    }

    // Apply date range filter if provided
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        query.createdAt.$lte = new Date(req.query.endDate as string);
      }
    }

    // Execute paginated query with populated user info
    const result = await PaginationHelper.paginate(
      CmsPage,
      query,
      paginationParams,
      undefined,
      [
        { path: "createdBy", select: "fullName firstName lastName" },
        { path: "updatedBy", select: "fullName firstName lastName" }
      ]
    );

    // Format user names with dates
    const formattedData = result.data.map((page: any) => {
      const obj = page.toObject ? page.toObject() : { ...page };
      return {
        ...obj,
        createdBy: formatUserWithDate(obj.createdBy, obj.createdAt),
        updatedBy: formatUserWithDate(obj.updatedBy, obj.updatedAt),
      };
    });

    return ResponseHandler.success(
      res,
      {
        data: formattedData,
        pagination: result.pagination,
        filters: {
          search: req.query.search || null,
          status: statusParam || null,
          startDate: req.query.startDate || null,
          endDate: req.query.endDate || null,
          sortBy: paginationParams.sortBy,
          sortOrder: paginationParams.sortOrder,
        },
      },
      "general.success",
      lang,
    );
  } catch (error) {
    logger.error("List CMS pages error:", error);
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
 * Get CMS Page By ID Controller
 */
export const getCmsPageById = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { pageId } = req.params;

    const page = await CmsPageService.getPageById(pageId);
    
    // Format the populated createdBy and updatedBy fields for details view
    const formattedPage = {
      ...page,
      createdBy: formatUserWithDate(page.createdBy, page.createdAt),
      updatedBy: formatUserWithDate(page.updatedBy, page.updatedAt),
    };

    return ResponseHandler.success(res, formattedPage, "general.success", lang);
  } catch (error: any) {
    logger.error("Get CMS page error:", error);
    const lang = getLanguage(req);

    if (error.message === "error.pageNotFound") {
      return ResponseHandler.notFound(res, "cms.pageNotFound", lang);
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
 * Get CMS Page By Slug Controller (Public)
 */
export const getCmsPageBySlug = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { slug } = req.params;

    const page = await CmsPageService.getPageBySlug(slug);
    return ResponseHandler.success(res, page, "general.success", lang);
  } catch (error: any) {
    logger.error("Get CMS page by slug error:", error);
    const lang = getLanguage(req);

    if (error.message === "error.pageNotFound") {
      return ResponseHandler.notFound(res, "cms.pageNotFound", lang);
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
 * Update CMS Page Controller
 */
export const updateCmsPage = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { pageId } = req.params;
    const { actorId, actorRole, requestMeta } = getReqMeta(req);

    const page = await CmsPageService.updatePage(pageId, req.body, actorId);

    // ── Sub-admin activity log ────────────────────────────────────────────────
    await SubAdminActivityHelper.logActivity({
      subAdminId: actorId ?? "",
      role: actorRole ?? "",
      module: "CmsPage",
      action: "edit",
      ...requestMeta,
      statusCode: HTTP_STATUS.OK,
    });

    return ResponseHandler.success(res, page, "cms.pageUpdated", lang);
  } catch (error: any) {
    logger.error("Update CMS page error:", error);
    const lang = getLanguage(req);

    if (error.code === 11000) {
      return ResponseHandler.validationError(
        res,
        { slug: "Slug already exists" },
        "validation.failed",
        lang,
      );
    }
    if (error.message === "error.pageNotFound") {
      return ResponseHandler.notFound(res, "cms.pageNotFound", lang);
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
 * Update CMS Page Status Controller
 */
export const updateCmsPageStatus = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { pageId } = req.params;
    // Handle both 'status' and 'activeStatus' from request body
    const status = req.body.status || req.body.activeStatus;
    const { actorId, actorRole, requestMeta } = getReqMeta(req);

    const page = await CmsPageService.updatePageStatus(pageId, status, actorId);

    // ── Sub-admin activity log ────────────────────────────────────────────────
    await SubAdminActivityHelper.logActivity({
      subAdminId: actorId ?? "",
      role: actorRole ?? "",
      module: "CmsPage",
      action: "edit",
      ...requestMeta,
      statusCode: HTTP_STATUS.OK,
    });

    return ResponseHandler.success(res, page, "cms.pageStatusUpdated", lang);
  } catch (error: any) {
    logger.error("Update CMS page status error:", error);
    const lang = getLanguage(req);

    if (error.message === "error.invalidStatusValue") {
      return ResponseHandler.validationError(
        res,
        { status: error.message },
        "validation.failed",
        lang,
      );
    }
    if (error.message === "error.pageNotFound") {
      return ResponseHandler.notFound(res, "cms.pageNotFound", lang);
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
 * Update CMS Page Publication Status Controller
 */
export const updateCmsPagePublicationStatus = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { pageId } = req.params;
    const { publicationStatus } = req.body;
    const { actorId, actorRole, requestMeta } = getReqMeta(req);

    const page = await CmsPageService.updatePagePublicationStatus(
      pageId,
      publicationStatus,
      actorId,
    );

    // ── Sub-admin activity log ────────────────────────────────────────────────
    await SubAdminActivityHelper.logActivity({
      subAdminId: actorId ?? "",
      role: actorRole ?? "",
      module: "CmsPage",
      action: "edit",
      ...requestMeta,
      statusCode: HTTP_STATUS.OK,
    });

    return ResponseHandler.success(
      res,
      page,
      "cms.pagePublicationStatusUpdated",
      lang,
    );
  } catch (error: any) {
    logger.error("Update CMS page publication status error:", error);
    const lang = getLanguage(req);

    if (error.message === "error.invalidStatusValue") {
      return ResponseHandler.validationError(
        res,
        { publicationStatus: error.message },
        "validation.failed",
        lang,
      );
    }
    if (error.message === "error.pageNotFound") {
      return ResponseHandler.notFound(res, "cms.pageNotFound", lang);
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
 * Delete CMS Page Controller (Soft Delete)
 */
export const deleteCmsPage = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { pageId } = req.params;
    const { actorId, actorRole, requestMeta } = getReqMeta(req);

    const page = await CmsPageService.deletePage(pageId, actorId);

    // ── Sub-admin activity log ────────────────────────────────────────────────
    await SubAdminActivityHelper.logActivity({
      subAdminId: actorId ?? "",
      role: actorRole ?? "",
      module: "CmsPage",
      action: "delete",
      ...requestMeta,
      statusCode: HTTP_STATUS.OK,
    });

    return ResponseHandler.success(res, page, "cms.pageDeleted", lang);
  } catch (error: any) {
    logger.error("Delete CMS page error:", error);
    const lang = getLanguage(req);

    if (error.message === "error.pageNotFound") {
      return ResponseHandler.notFound(res, "cms.pageNotFound", lang);
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
 * Helper function to resolve language from query parameter or headers
 */
const resolveLanguage = (
  req: Request,
  queryLang?: string | string[],
): "en" | "ar" | "hi" | undefined => {
  if (
    queryLang &&
    typeof queryLang === "string" &&
    (queryLang === "en" || queryLang === "ar" || queryLang === "hi")
  ) {
    return queryLang;
  }
  return getLanguage(req);
};

/**
 * Get Public Static Page Controller (Query-based)
 * Endpoint: /api/v1/pages?slug=terms&lang=en
 */
export const getPublicStaticPage = async (req: Request, res: Response) => {
  try {
    const { slug, lang: queryLang } = req.query;

    // Validate slug parameter
    if (!slug || typeof slug !== "string") {
      const lang = getLanguage(req);
      return ResponseHandler.validationError(
        res,
        { slug: "Slug parameter is required" },
        "validation.failed",
        lang,
      );
    }

    const lang = resolveLanguage(req, queryLang as string);
    const page = await CmsPageService.getPageBySlug(slug);
    return ResponseHandler.success(res, page, "general.success", lang);
  } catch (error: any) {
    logger.error("Get public static page error:", error);
    const { lang: queryLang } = req.query;
    const lang = resolveLanguage(req, queryLang as string);

    if (error.message === "error.pageNotFound") {
      return ResponseHandler.notFound(res, "cms.pageNotFound", lang);
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

export default {
  createCmsPage,
  listCmsPages,
  getCmsPageById,
  getCmsPageBySlug,
  updateCmsPage,
  updateCmsPageStatus,
  updateCmsPagePublicationStatus,
  deleteCmsPage,
  getPublicStaticPage,
};
