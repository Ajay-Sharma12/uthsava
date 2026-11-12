import { Request, Response } from "express";
import { Types } from "mongoose";
import { SubAdminService, ERROR_MESSAGES } from "../services/subadmin.service";
import { ResponseHandler } from "../../../common/responses/response.handler";
import { getLanguage } from "../../shared/helpers/language.helper";
import { PaginationHelper } from "../../shared/helpers/pagination.helper";
import {
  QueryBuilder,
  SUBADMIN_SORT_FIELDS,
  SUBADMIN_SEARCH_FIELDS,
} from "../../shared/helpers/query-builder.helper";
import { logger } from "../../../core/constants/logger";
import { HTTP_STATUS } from "../../../core/constants/app.constants";
import { JwtPayload } from "../../../common/types/auth.types";
import { AuditLogService } from "../services/audit-log.service";
import { AuditModule } from "../../../models/audit-log.model";

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * List SubAdmins Controller
 * Returns paginated, filtered, and sorted list of subadmins
 */
export const listSubAdmins = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { search, sortBy, sortOrder, fromDate, toDate, status } = req.query;
    const currentUserId = req.user?.sub;

    const pagination = PaginationHelper.parseParams(req.query, [
      ...SUBADMIN_SORT_FIELDS,
    ]);

    const query = QueryBuilder.buildListingQuery({
      search: search as string,
      searchFields: [...SUBADMIN_SEARCH_FIELDS],
      startDate: fromDate as string,
      endDate: toDate as string,
      dateField: "createdAt",
    });

    // Exclude current user from results
    if (currentUserId) {
      query._id = { $ne: new Types.ObjectId(currentUserId) };
    }

    if (status && status !== "all") {
      query.status = status;
    }

    const result = await SubAdminService.listSubAdmins(pagination, query);

    return ResponseHandler.success(
      res,
      {
        data: result.data.map(SubAdminService.sanitizeSubAdmin),
        pagination: result.pagination,
        counts: result.counts,
        filters: {
          search: search as string,
          fromDate: fromDate as string,
          toDate: toDate as string,
          status: status as string,
          sortBy: sortBy as string,
          sortOrder: sortOrder as string,
        },
      },
      "subadmin.listed",
      lang,
    );
  } catch (error: any) {
    logger.error("List subadmins error:", error);
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
 * Get SubAdmin by ID Controller
 */
export const getSubAdminById = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { subAdminId } = req.params;

    const subAdmin = await SubAdminService.getSubAdminById(subAdminId);

    if (!subAdmin) {
      return ResponseHandler.error(
        res,
        "subadmin.not_found",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    const sanitized = SubAdminService.sanitizeSubAdmin(subAdmin);
    
    return ResponseHandler.success(
      res,
      {
        subAdmin: sanitized,
        role: (subAdmin as any).roleId,
        permissions: sanitized.permissions,
        customPermissions: sanitized.customPermissions,
        isActionRequired: (subAdmin as any).isActionRequired || false
      },
      "subadmin.retrieved",
      lang,
    );
  } catch (error: any) {
    logger.error("Get subadmin by ID error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.INVALID_SUBADMIN_ID) {
      return ResponseHandler.validationError(
        res,
        { subAdminId: error.message },
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
 * Create SubAdmin Controller
 */
export const createSubAdmin = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const data = req.body;

    // Add addedBy field from authenticated user
    if ((req as any).user) {
      data.addedBy = (req as any).user.sub;
    }

    const { subAdmin: newSubAdmin, temporaryPassword } =
      await SubAdminService.createSubAdmin(data, req);

    AuditLogService.logAction({
      adminId: (req as any).user?.sub || (req as any).user?._id,
      module: AuditModule.SUB_ADMINS,
      action: "Create Sub-Admin",
      entityId: (newSubAdmin as any)._id || (newSubAdmin as any).id,
      newData: SubAdminService.sanitizeSubAdmin(newSubAdmin),
      req,
    }).catch(err => logger.error("Audit log error:", err));

    return ResponseHandler.success(
      res,
      {
        subAdmin: SubAdminService.sanitizeSubAdmin(newSubAdmin),
        // Return the auto-generated password once so the admin can share it
        temporaryPassword,
      },
      "subadmin.created",
      lang,
      HTTP_STATUS.CREATED,
    );
  } catch (error: any) {
    logger.error("Create subadmin error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.EMAIL_EXISTS) {
      const role = error.role ? ` with ${error.role} role` : "";
      const message = `Email already exists${role}`;
      return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: message,
        error: null,
      });
    }

    if (error.message === ERROR_MESSAGES.MOBILE_EXISTS) {
      const role = error.role ? ` with ${error.role} role` : "";
      const message = `Mobile number already exists${role}`;
      return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: message,
        error: null,
      });
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
 * Update SubAdmin Controller
 */
export const updateSubAdmin = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { subAdminId } = req.params;
    const updateData = req.body;

    const updatedSubAdmin = await SubAdminService.updateSubAdmin(
      subAdminId,
      updateData,
      req,
    );

    if (!updatedSubAdmin) {
      return ResponseHandler.error(
        res,
        "subadmin.not_found",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    AuditLogService.logAction({
      adminId: (req as any).user?.sub || (req as any).user?._id,
      module: AuditModule.SUB_ADMINS,
      action: "Update Sub-Admin",
      entityId: subAdminId,
      newData: updateData,
      req,
    }).catch(err => logger.error("Audit log error:", err));

    return ResponseHandler.success(
      res,
      {
        subAdmin: SubAdminService.sanitizeSubAdmin(updatedSubAdmin),
      },
      "subadmin.updated",
      lang,
    );
  } catch (error: any) {
    logger.error("Update subadmin error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.SUBADMIN_NOT_FOUND) {
      return ResponseHandler.error(
        res,
        "subadmin.not_found",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    if (error.message === ERROR_MESSAGES.EMAIL_EXISTS) {
      return ResponseHandler.validationError(
        res,
        { email: "Email already exists" },
        "validation.failed",
        lang,
      );
    }

    if (error.message === ERROR_MESSAGES.MOBILE_EXISTS) {
      return ResponseHandler.validationError(
        res,
        { mobile: "Mobile number already exists" },
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
 * Update SubAdmin Status Controller
 */
export const updateSubAdminStatus = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { subAdminId } = req.params;
    const { status } = req.body;

    const updatedSubAdmin = await SubAdminService.updateSubAdmin(subAdminId, {
      status,
    });

    AuditLogService.logAction({
      adminId: (req as any).user?.sub || (req as any).user?._id,
      module: AuditModule.SUB_ADMINS,
      action: "Update Sub-Admin Status",
      entityId: subAdminId,
      newData: { status },
      req,
    }).catch(err => logger.error("Audit log error:", err));

    return ResponseHandler.success(
      res,
      {
        subAdmin: SubAdminService.sanitizeSubAdmin(updatedSubAdmin),
      },
      "subadmin.updated",
      lang,
    );
  } catch (error: any) {
    logger.error("Update subadmin status error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.SUBADMIN_NOT_FOUND) {
      return ResponseHandler.error(
        res,
        "subadmin.not_found",
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
 * List SubAdmin Activity Controller
 */
export const listSubAdminActivities = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { subAdminId } = req.params;
    const pagination = PaginationHelper.parseParams(req.query, [
      "module",
      "action",
      "method",
      "statusCode",
      "createdAt",
      "updatedAt",
    ]);

    const result = await SubAdminService.listSubAdminActivities(
      subAdminId,
      pagination,
    );

    return ResponseHandler.success(
      res,
      result,
      "subadmin.activities.listed",
      lang,
    );
  } catch (error: any) {
    logger.error("List subadmin activities error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.SUBADMIN_NOT_FOUND) {
      return ResponseHandler.error(
        res,
        "subadmin.not_found",
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
 * Delete SubAdmin Controller
 */
export const deleteSubAdmin = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { subAdminId } = req.params;

    await SubAdminService.deleteSubAdmin(subAdminId);

    AuditLogService.logAction({
      adminId: (req as any).user?.sub || (req as any).user?._id,
      module: AuditModule.SUB_ADMINS,
      action: "Delete Sub-Admin",
      entityId: subAdminId,
      req,
    }).catch(err => logger.error("Audit log error:", err));

    return ResponseHandler.success(res, null, "subadmin.deleted", lang);
  } catch (error: any) {
    logger.error("Delete subadmin error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.SUBADMIN_NOT_FOUND) {
      return ResponseHandler.error(
        res,
        "subadmin.not_found",
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
