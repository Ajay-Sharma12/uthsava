import { Request, Response } from "express";
import {
  EmailTemplateService,
  ERROR_MESSAGES,
} from "../services/email-template.service";
import { ResponseHandler } from "../../../common/responses/response.handler";
import { getLanguage } from "../../shared/helpers/language.helper";
import { PaginationHelper } from "../../shared/helpers/pagination.helper";
import {
  QueryBuilder,
  EMAIL_TEMPLATE_SORT_FIELDS,
} from "../../shared/helpers/query-builder.helper";
import { logger } from "../../../core/constants/logger";
import { HTTP_STATUS } from "../../../core/constants/app.constants";
import { JwtPayload } from "../../../common/types/auth.types";

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * Create Email Template Controller
 * Creates a new email template with validation
 */
export const createEmailTemplate = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { title, subject, description, signature, status, keywordList } = req.body;
    const actorId = (req as AuthenticatedRequest).user?.sub;

    const newTemplate = await EmailTemplateService.createEmailTemplate({
      title,
      subject,
      description,
      signature,
      status,
      keywordList,
    }, actorId);

    return ResponseHandler.success(
      res,
      {
        emailTemplate: EmailTemplateService.sanitizeEmailTemplate(newTemplate),
      },
      "email_template.created",
      lang,
      HTTP_STATUS.CREATED,
    );
  } catch (error: any) {
    logger.error("Create email template error:", error);
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
 * List Email Templates Controller
 * Returns paginated, filtered, and sorted list of email templates
 */
export const listEmailTemplates = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { search, sortBy, sortOrder, fromDate, toDate, status } = req.query;

    // Default sorting to updatedAt (last modified date) when sortBy is not specified or set to createdAt
    const effectiveSortBy = (!sortBy || sortBy === "createdAt") ? "updatedAt" : (sortBy as string);

    const pagination = PaginationHelper.parseParams(
      {
        ...req.query,
        sortBy: effectiveSortBy,
      },
      [...EMAIL_TEMPLATE_SORT_FIELDS]
    );
    const page = Number.parseInt(req.query.page as string, 10) || 1;
    const limit = Number.parseInt(req.query.limit as string, 10) || 10;
    const serialStart = (page - 1) * limit;

    const query = QueryBuilder.buildListingQuery({
      search: search as string,
      searchFields: ["title"],
      startDate: fromDate as string,
      endDate: toDate as string,
      dateField: "updatedAt",
    });

    // Add status filter if provided
    if (status && status !== "all") {
      query.status = status;
    }

    const result = await EmailTemplateService.listEmailTemplates(
      pagination,
      query,
    );

    return ResponseHandler.success(
      res,
      {
        data: result.data.map((template, index) =>
          EmailTemplateService.formatListItem(
            template,
            serialStart + index + 1,
          ),
        ),
        pagination: result.pagination,
        counts: result.counts,
        filters: {
          search: search as string,
          fromDate: fromDate as string,
          toDate: toDate as string,
          status: status as string,
          sortBy: effectiveSortBy,
          sortOrder: pagination.sortOrder,
        },
      },
      "email_template.listed",
      lang,
    );
  } catch (error: any) {
    logger.error("List email templates error:", error);
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
 * Get Email Template by ID Controller
 */
export const getEmailTemplateById = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { templateId } = req.params;

    const template =
      await EmailTemplateService.getEmailTemplateById(templateId);

    if (!template) {
      return ResponseHandler.error(
        res,
        "email_template.not_found",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    return ResponseHandler.success(
      res,
      {
        emailTemplate: EmailTemplateService.sanitizeEmailTemplate(template),
      },
      "email_template.retrieved",
      lang,
    );
  } catch (error: any) {
    logger.error("Get email template by ID error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.INVALID_TEMPLATE_ID) {
      return ResponseHandler.validationError(
        res,
        { templateId: error.message },
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
 * Search Email Templates Controller
 */
export const searchEmailTemplates = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { search, limit = 10 } = req.query;

    if (!search) {
      return ResponseHandler.validationError(
        res,
        { search: "Search term is required" },
        "validation.failed",
        lang,
      );
    }

    const templates = await EmailTemplateService.searchEmailTemplates(
      search as string,
      Number.parseInt(limit as string),
    );

    return ResponseHandler.success(
      res,
      {
        emailTemplates: templates.map(
          EmailTemplateService.sanitizeEmailTemplate,
        ),
        search: search as string,
        limit: Number.parseInt(limit as string),
      },
      "email_template.listed",
      lang,
    );
  } catch (error: any) {
    logger.error("Search email templates error:", error);
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
 * Update Email Template Controller
 */
export const updateEmailTemplate = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { templateId } = req.params;
    const updateData = req.body;
    const actorId = (req as AuthenticatedRequest).user?.sub;

    const updatedTemplate = await EmailTemplateService.updateTemplate(
      templateId,
      updateData,
      actorId,
    );

    if (!updatedTemplate) {
      return ResponseHandler.error(
        res,
        "email_template.not_found",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    return ResponseHandler.success(
      res,
      {
        emailTemplate:
          EmailTemplateService.sanitizeEmailTemplate(updatedTemplate),
      },
      "email_template.updated",
      lang,
    );
  } catch (error: any) {
    logger.error("Update email template error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.INVALID_TEMPLATE_ID) {
      return ResponseHandler.validationError(
        res,
        { templateId: error.message },
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
 * Update Email Template Status Controller
 */
export const updateEmailTemplateStatus = async (
  req: Request,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { templateId } = req.params;
    const { status } = req.body;
    const actorId = (req as AuthenticatedRequest).user?.sub;

    const updatedTemplate = await EmailTemplateService.updateTemplate(
      templateId,
      {
        status,
      },
      actorId,
    );

    if (!updatedTemplate) {
      return ResponseHandler.error(
        res,
        "email_template.not_found",
        lang,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    return ResponseHandler.success(
      res,
      {
        emailTemplate:
          EmailTemplateService.sanitizeEmailTemplate(updatedTemplate),
      },
      "email_template.status_updated",
      lang,
    );
  } catch (error: any) {
    logger.error("Update email template status error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.INVALID_TEMPLATE_ID) {
      return ResponseHandler.validationError(
        res,
        { templateId: error.message },
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
 * Send Bulk Email Controller
 */
export const sendBulkEmail = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { templateId } = req.params;
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return ResponseHandler.validationError(
        res,
        { userIds: "A valid array of userIds is required" },
        "validation.failed",
        lang,
      );
    }

    const result = await EmailTemplateService.sendBulkEmail(templateId, userIds);

    return ResponseHandler.success(
      res,
      {
        enqueued: result.enqueued,
      },
      "email_template.bulk_send_initiated", // You could add this key to i18n
      lang,
    );
  } catch (error: any) {
    logger.error("Send bulk email error:", error);
    const lang = getLanguage(req);

    if (error.message === ERROR_MESSAGES.INVALID_TEMPLATE_ID) {
      return ResponseHandler.validationError(
        res,
        { templateId: error.message },
        "validation.failed",
        lang,
      );
    }

    if (error.message === ERROR_MESSAGES.TEMPLATE_NOT_FOUND) {
      return ResponseHandler.error(
        res,
        "email_template.not_found",
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
