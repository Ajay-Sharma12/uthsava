import { Request, Response } from "express";
import { ProducerService, ERROR_MESSAGES } from "../services/producer.service";
import { ResponseHandler } from "../../../common/responses/response.handler";
import { getLanguage } from "../../shared/helpers/language.helper";
import { PaginationHelper } from "../../shared/helpers/pagination.helper";
import { QueryBuilder } from "../../shared/helpers/query-builder.helper";
import { logger } from "../../../core/constants/logger";
import { HTTP_STATUS } from "../../../core/constants/app.constants";
import { Types } from "mongoose";
import { AuditLogService } from "../services/audit-log.service";
import { AuditModule } from "../../../models/audit-log.model";

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/producers
 * Paginated, searchable, filterable producer list
 */
export const listProducers = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { search, status, fromDate, toDate, sortBy, sortOrder } = req.query;

    const pagination = PaginationHelper.parseParams(req.query, [
      "email",
      "fullName",
      "firstName",
      "lastName",
      "mobile",
      "companyName",
      "status",
      "createdAt",
      "updatedAt",
    ]);

    const query = QueryBuilder.buildListingQuery({
      search: search as string,
      searchFields: [
        "email",
        "fullName",
        "firstName",
        "lastName",
        "mobile",
        "companyName",
      ],
      startDate: fromDate as string,
      endDate: toDate as string,
      dateField: "createdAt",
    });

    if (status && status !== "all") {
      query.status = status;
    }

    const result = await ProducerService.listProducers(pagination, query);

    return ResponseHandler.success(
      res,
      {
        ...result,
        filters: { search, status, fromDate, toDate, sortBy, sortOrder },
      },
      "producer.listed",
      lang,
    );
  } catch (error: any) {
    logger.error("List producers error:", error);
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
 * GET /api/v1/admin/producers/:producerId
 * Basic producer record
 */
export const getProducerById = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { producerId } = req.params;

    const producer = await ProducerService.getProducerById(producerId);
    if (!producer) {
      return ResponseHandler.error(
        res,
        "producer.not_found",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    return ResponseHandler.success(
      res,
      { producer: ProducerService.sanitizeProducer(producer) },
      "producer.retrieved",
      lang,
    );
  } catch (error: any) {
    logger.error("Get producer by ID error:", error);
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

// ─── Detail view ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/producers/:producerId/detail
 * Full detail: producer info + content count + total earnings
 */
export const getProducerDetail = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { producerId } = req.params;

    if (!Types.ObjectId.isValid(producerId)) {
      return ResponseHandler.validationError(
        res,
        { producerId: "Invalid producer ID format" },
        "validation.failed",
        lang,
      );
    }

    const detail = await ProducerService.getProducerDetail(producerId);

    return ResponseHandler.success(res, detail, "producer.retrieved", lang);
  } catch (error: any) {
    logger.error("Get producer detail error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.PRODUCER_NOT_FOUND) {
      return ResponseHandler.error(
        res,
        "producer.not_found",
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

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/admin/producers
 * Admin-only: create a producer account with auto-generated credentials
 */
export const createProducer = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const data = req.body;

    // Add createdBy and lastModifiedBy fields from authenticated user
    if ((req as any).user) {
      data.createdBy = (req as any).user.sub;
      data.lastModifiedBy = (req as any).user.sub;
    }

    const producer = await ProducerService.createProducer(data, req);

    if ((req as any).user) {
      await AuditLogService.logAction({
        adminId: (req as any).user.sub,
        module: AuditModule.PRODUCERS,
        action: "Create Producer",
        entityId: producer._id as Types.ObjectId,
        newData: data,
        req,
      });
    }

    return ResponseHandler.success(
      res,
      { producer: ProducerService.sanitizeProducer(producer) },
      "producer.created",
      lang,
      HTTP_STATUS.CREATED,
    );
  } catch (error: any) {
    logger.error("Create producer error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.EMAIL_EXISTS) {
      return ResponseHandler.validationError(
        res,
        { email: "Email already exists" },
        "validation.failed",
        lang,
      );
    }
    if (error.message === "MOBILE_EXISTS") {
      return ResponseHandler.validationError(
        res,
        { mobile: "Mobile number already exists" },
        "validation.failed",
        lang,
      );
    }
    if (error.code === 11000) {
      return ResponseHandler.validationError(
        res,
        { email: "Email already exists" },
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

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * PUT /api/v1/admin/producers/:producerId
 * Edit producer details
 */
export const updateProducer = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { producerId } = req.params;
    const updateData = req.body;

    // Add lastModifiedBy field from authenticated user
    if ((req as any).user) {
      updateData.lastModifiedBy = (req as any).user.sub;
    }

    const producer = await ProducerService.updateProducer(producerId, updateData);

    if ((req as any).user) {
      await AuditLogService.logAction({
        adminId: (req as any).user.sub,
        module: AuditModule.PRODUCERS,
        action: "Update Producer",
        entityId: producerId,
        newData: updateData,
        req,
      });
    }

    return ResponseHandler.success(
      res,
      { producer: ProducerService.sanitizeProducer(producer) },
      "producer.updated",
      lang,
    );
  } catch (error: any) {
    logger.error("Update producer error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.PRODUCER_NOT_FOUND) {
      return ResponseHandler.error(
        res,
        "producer.not_found",
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
    if (error.message === "MOBILE_EXISTS") {
      return ResponseHandler.validationError(
        res,
        { mobile: "Mobile number already exists" },
        "validation.failed",
        lang,
      );
    }
    if (error.code === 11000) {
      return ResponseHandler.validationError(
        res,
        { email: "Email already exists" },
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

// ─── Status toggle ────────────────────────────────────────────────────────────

/**
 * PATCH /api/v1/admin/producers/:producerId/status
 * Activate or deactivate a producer
 */
export const updateProducerStatus = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { producerId } = req.params;
    const { status } = req.body;
    
    const updateData: any = { status };
    // Add lastModifiedBy field from authenticated user
    if ((req as any).user) {
      updateData.lastModifiedBy = (req as any).user.sub;
    }

    const producer = await ProducerService.updateProducer(producerId, updateData);

    if ((req as any).user) {
      await AuditLogService.logAction({
        adminId: (req as any).user.sub,
        module: AuditModule.PRODUCERS,
        action: "Update Producer Status",
        entityId: producerId,
        newData: updateData,
        req,
      });
    }

    return ResponseHandler.success(
      res,
      { producer: ProducerService.sanitizeProducer(producer) },
      "producer.updated",
      lang,
    );
  } catch (error: any) {
    logger.error("Update producer status error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.PRODUCER_NOT_FOUND) {
      return ResponseHandler.error(
        res,
        "producer.not_found",
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

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * DELETE /api/v1/admin/producers/:producerId
 * Soft-delete a producer
 */
export const deleteProducer = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { producerId } = req.params;

    await ProducerService.deleteProducer(producerId);

    if ((req as any).user) {
      await AuditLogService.logAction({
        adminId: (req as any).user.sub,
        module: AuditModule.PRODUCERS,
        action: "Delete Producer",
        entityId: producerId,
        req,
      });
    }

    return ResponseHandler.success(res, null, "producer.deleted", lang);
  } catch (error: any) {
    logger.error("Delete producer error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.PRODUCER_NOT_FOUND) {
      return ResponseHandler.error(
        res,
        "producer.not_found",
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
