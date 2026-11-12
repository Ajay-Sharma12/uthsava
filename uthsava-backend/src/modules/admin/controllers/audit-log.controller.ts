import { Request, Response } from "express";
import { AuditLogService } from "../services/audit-log.service";
import { ResponseHandler } from "../../../common/responses/response.handler";
import { getLanguage } from "../../shared/helpers/language.helper";
import { PaginationHelper } from "../../shared/helpers/pagination.helper";
import { QueryBuilder } from "../../shared/helpers/query-builder.helper";
import { logger } from "../../../core/constants/logger";
import { HTTP_STATUS } from "../../../core/constants/app.constants";
import { Types } from "mongoose";

/**
 * GET /api/v1/admin/audit-logs
 * Paginated, filterable audit logs list
 */
export const listAuditLogs = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { module, action, adminId, fromDate, toDate, status, search, q } = req.query;
    const searchTerm = (search || q) as string | undefined;

    const pagination = PaginationHelper.parseParams(req.query, [
      "createdAt",
      "updatedAt",
      "module",
      "action",
      "status"
    ]);

    const query = QueryBuilder.buildListingQuery({
      search: searchTerm,
      searchFields: ["action", "device", "ipAddress", "module", "failureReason"],
      startDate: fromDate as string,
      endDate: toDate as string,
      dateField: "createdAt",
    });

    if (module && module !== "ALL" && module !== "all") query.module = module;
    if (action) query.action = { $regex: action as string, $options: "i" };
    if (adminId && Types.ObjectId.isValid(adminId as string)) {
      query.adminId = adminId;
    }
    if (status && status !== "ALL" && status !== "all") query.status = status;

    const result = await AuditLogService.listLogs(pagination, query);

    return ResponseHandler.success(
      res,
      {
        ...result,
        filters: { module, action, adminId, fromDate, toDate, status },
      },
      "auditLog.listed",
      lang,
    );
  } catch (error: any) {
    logger.error("List audit logs error:", error);
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
 * GET /api/v1/admin/audit-logs/:logId
 * Get a single audit log
 */
export const getAuditLogById = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { logId } = req.params;

    if (!Types.ObjectId.isValid(logId)) {
      return ResponseHandler.validationError(
        res,
        { logId: "Invalid audit log ID format" },
        "validation.failed",
        lang,
      );
    }

    const log = await AuditLogService.getLogById(logId);

    return ResponseHandler.success(
      res,
      { log },
      "auditLog.retrieved",
      lang,
    );
  } catch (error: any) {
    logger.error("Get audit log by ID error:", error);
    const lang = getLanguage(req);

    if (error.message === "error.auditLogNotFound") {
      return ResponseHandler.error(
        res,
        "auditLog.not_found",
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
