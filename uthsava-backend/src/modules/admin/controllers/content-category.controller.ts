import { Request, Response } from "express";
import {
  ContentCategoryService,
  ERROR_MESSAGES,
  CONTENT_CATEGORY_SEARCH_FIELDS,
} from "../services/content-category.service";
import { ResponseHandler } from "../../../common/responses/response.handler";
import { getLanguage } from "../../shared/helpers/language.helper";
import { PaginationHelper } from "../../shared/helpers/pagination.helper";
import { QueryBuilder } from "../../shared/helpers/query-builder.helper";
import { logger } from "../../../core/constants/logger";
import { HTTP_STATUS } from "../../../core/constants/app.constants";
import { type as CategoryGenreType } from "../../../models";
import { AuditLogService } from "../services/audit-log.service";
import { AuditModule } from "../../../models/audit-log.model";

/**
 * GET /api/v1/categories (public)
 * Active categories/genres for content upload & filtering
 */
export const listPublicContentCategories = async (
  req: Request,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const type =
      (req.query.type as CategoryGenreType) || CategoryGenreType.CATEGORY;
    if (!Object.values(CategoryGenreType).includes(type)) {
      return ResponseHandler.validationError(
        res,
        { type: "Type must be category or genre" },
        "validation.failed",
        lang,
      );
    }

    const items = await ContentCategoryService.listActive(type);
    return ResponseHandler.success(
      res,
      { data: items },
      "contentCategory.listed",
      lang,
    );
  } catch (error: any) {
    logger.error("List public content categories error:", error);
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
 * GET /api/v1/categories/active
 * GET /api/v1/categories/active-categories
 *
 * Dedicated Mobile API to retrieve active categories and genres.
 * Query Params:
 *  - type (optional): "category", "genre", or "all" (defaults to "all")
 */
export const listActiveContentCategoriesMobile = async (
  req: Request,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const typeFilter = req.query.type as string | undefined;

    const page = Math.max(1, Number.parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit as string) || 10));

    const result = await ContentCategoryService.listActiveMobile(typeFilter, page, limit);

    return ResponseHandler.success(
      res,
      result,
      "contentCategory.listed",
      lang,
    );
  } catch (error: any) {
    logger.error("List active mobile content categories error:", error);
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
 * GET /api/v1/admin/categories
 * List categories or genres (type query required)
 */
export const listContentCategories = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { search, status, fromDate, toDate, sortBy, sortOrder, type } =
      req.query;

    const pagination = PaginationHelper.parseParams(req.query, [
      "name",
      "displayOrder",
      "status",
      "createdAt",
      "updatedAt",
      "contentCount",
    ]);

    const query = QueryBuilder.buildListingQuery({
      search: search as string,
      searchFields: CONTENT_CATEGORY_SEARCH_FIELDS,
      startDate: fromDate as string,
      endDate: toDate as string,
      dateField: "createdAt",
    });

    // Apply status filter
    if (status && status !== "all" && status !== "") {
      query.status = status === "active" ? "active" : "inactive";
    }

    // Filter by type query parameter from the frontend (category or genre)
    let actualType = type as string;
    
    // Convert plural to singular if needed
    if (actualType === "categories") {
      actualType = "category";
    } else if (actualType === "genres") {
      actualType = "genre";
    }

    const result = await ContentCategoryService.list(
      actualType as CategoryGenreType,
      pagination,
      query,
    );

    return ResponseHandler.success(
      res,
      {
        ...result,
        filters: { type, search, status, fromDate, toDate, sortBy, sortOrder },
      },
      "contentCategory.listed",
      lang,
    );
  } catch (error: any) {
    logger.error("List content categories error:", error);
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
 * GET /api/v1/admin/categories/:categoryId
 */
export const getContentCategoryById = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { categoryId } = req.params;

    const item = await ContentCategoryService.getById(categoryId);
    if (!item) {
      return ResponseHandler.error(
        res,
        ERROR_MESSAGES.NOT_FOUND,
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    return ResponseHandler.success(
      res,
      { category: item },
      "contentCategory.retrieved",
      lang,
    );
  } catch (error: any) {
    logger.error("Get content category error:", error);
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
 * POST /api/v1/admin/categories
 */
export const createContentCategory = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const adminId = (req as any).user?.sub || (req as any).user?.id;
    const item = await ContentCategoryService.create(req.body, adminId);

    const isCat = (item as any)?.type === "category";
    AuditLogService.logAction({
      adminId,
      module: isCat ? AuditModule.CATEGORIES : AuditModule.GENRES,
      action: `Create ${isCat ? "Category" : "Genre"}`,
      entityId: (item as any)?._id || (item as any)?.id,
      newData: req.body,
      req,
    }).catch(err => logger.error("Audit log error:", err));

    return ResponseHandler.success(
      res,
      { category: item },
      "contentCategory.created",
      lang,
      HTTP_STATUS.CREATED,
    );
  } catch (error: any) {
    logger.error("Create content category error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.NAME_EXISTS) {
      return ResponseHandler.validationError(
        res,
        { name: "A category or genre with this name already exists" },
        "validation.failed",
        lang,
      );
    }
    if (error.message === ERROR_MESSAGES.DISPLAY_ORDER_EXISTS) {
      return ResponseHandler.validationError(
        res,
        { displayOrder: `Display order is already assigned to "${error.existingName || 'another item'}"` },
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
 * PUT /api/v1/admin/categories/:categoryId
 */
export const updateContentCategory = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { categoryId } = req.params;
    const adminId = (req as any).user?.sub || (req as any).user?.id;

    const item = await ContentCategoryService.update(categoryId, req.body, adminId);

    const isCat = item.type === "category";
    AuditLogService.logAction({
      adminId,
      module: isCat ? AuditModule.CATEGORIES : AuditModule.GENRES,
      action: `Update ${isCat ? "Category" : "Genre"}`,
      entityId: categoryId,
      newData: req.body,
      req,
    }).catch(err => logger.error("Audit log error:", err));

    return ResponseHandler.success(
      res,
      { category: item },
      "contentCategory.updated",
      lang,
    );
  } catch (error: any) {
    logger.error("Update content category error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.NOT_FOUND) {
      return ResponseHandler.error(
        res,
        ERROR_MESSAGES.NOT_FOUND,
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }
    if (error.message === ERROR_MESSAGES.NAME_EXISTS) {
      return ResponseHandler.validationError(
        res,
        { name: "A category or genre with this name already exists" },
        "validation.failed",
        lang,
      );
    }
    if (error.message === ERROR_MESSAGES.DISPLAY_ORDER_EXISTS) {
      return ResponseHandler.validationError(
        res,
        { displayOrder: `Display order is already assigned to "${error.existingName || 'another item'}"` },
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
 * PATCH /api/v1/admin/categories/:categoryId/status
 */
export const updateContentCategoryStatus = async (
  req: Request,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { categoryId } = req.params;
    const { status } = req.body;

    const item = await ContentCategoryService.updateStatus(categoryId, status);

    const isCat = item.type === "category";
    AuditLogService.logAction({
      adminId: (req as any).user?.sub || (req as any).user?.id,
      module: isCat ? AuditModule.CATEGORIES : AuditModule.GENRES,
      action: `Update ${isCat ? "Category" : "Genre"} Status`,
      entityId: categoryId,
      newData: { status },
      req,
    }).catch(err => logger.error("Audit log error:", err));

    return ResponseHandler.success(
      res,
      { category: item },
      "contentCategory.status_updated",
      lang,
    );
  } catch (error: any) {
    logger.error("Update content category status error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.NOT_FOUND) {
      return ResponseHandler.error(
        res,
        ERROR_MESSAGES.NOT_FOUND,
        lang,
        HTTP_STATUS.NOT_FOUND,
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
 * PATCH /api/v1/admin/categories/:categoryId/display-order
 */
export const updateContentCategoryDisplayOrder = async (
  req: Request,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { categoryId } = req.params;
    const { displayOrder } = req.body;

    const item = await ContentCategoryService.updateDisplayOrder(
      categoryId,
      displayOrder,
    );

    const isCat = item.type === "category";
    AuditLogService.logAction({
      adminId: (req as any).user?.sub || (req as any).user?.id,
      module: isCat ? AuditModule.CATEGORIES : AuditModule.GENRES,
      action: `Update ${isCat ? "Category" : "Genre"} Display Order`,
      entityId: categoryId,
      newData: { displayOrder },
      req,
    }).catch(err => logger.error("Audit log error:", err));

    return ResponseHandler.success(
      res,
      { category: item },
      "contentCategory.order_updated",
      lang,
    );
  } catch (error: any) {
    logger.error("Update content category display order error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.NOT_FOUND) {
      return ResponseHandler.error(
        res,
        ERROR_MESSAGES.NOT_FOUND,
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }
    if (error.message === ERROR_MESSAGES.DISPLAY_ORDER_EXISTS) {
      return ResponseHandler.validationError(
        res,
        { displayOrder: `Display order is already assigned to "${error.existingName || 'another item'}"` },
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
 * DELETE /api/v1/admin/categories/:categoryId
 */
export const deleteContentCategory = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { categoryId } = req.params;

    await ContentCategoryService.delete(categoryId);

    AuditLogService.logAction({
      adminId: (req as any).user?.sub || (req as any).user?.id,
      module: AuditModule.CATEGORIES,
      action: "Delete Category / Genre",
      entityId: categoryId,
      req,
    }).catch(err => logger.error("Audit log error:", err));

    return ResponseHandler.success(res, null, "contentCategory.deleted", lang);
  } catch (error: any) {
    logger.error("Delete content category error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.NOT_FOUND) {
      return ResponseHandler.error(
        res,
        ERROR_MESSAGES.NOT_FOUND,
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }
    if (error.message === ERROR_MESSAGES.MAPPED_TO_CONTENT) {
      return ResponseHandler.error(
        res,
        ERROR_MESSAGES.MAPPED_TO_CONTENT,
        lang,
        HTTP_STATUS.CONFLICT,
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
