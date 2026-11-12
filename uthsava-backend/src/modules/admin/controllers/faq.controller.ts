import { Request, Response } from "express";
import { FaqService } from "../services/faq.service";
import { ResponseHandler } from "../../../common/responses/response.handler";
import { getLanguage } from "../../shared/helpers/language.helper";
import { PaginationHelper } from "../../shared/helpers/pagination.helper";
import { QueryBuilder } from "../../shared/helpers/query-builder.helper";
import { Faq, FaqStatus } from "../../../models";
import { logger } from "../../../core/constants/logger";
import { HTTP_STATUS } from "../../../core/constants/app.constants";
import { JwtPayload } from "../../../common/types/auth.types";

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

const FAQ_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "order",
  "question",
  "status",
];
const FAQ_SEARCH_FIELDS = ["question", "answer"];

/**
 * Create FAQ Controller
 */
export const createFaq = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lang = getLanguage(req);
    const userId = req.user?.sub;

    const faq = await FaqService.createFaq(req.body, userId);

    return ResponseHandler.success(
      res,
      faq,
      "faq.created",
      lang,
      HTTP_STATUS.CREATED,
    );
  } catch (error: any) {
    logger.error("Create FAQ error:", error);
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
 * List FAQs Controller
 */
export const listFaqs = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);

    // Parse pagination parameters
    const paginationParams = PaginationHelper.parseParams(
      req.query,
      FAQ_SORT_FIELDS,
    );

    // Build query
    const query = QueryBuilder.buildListingQuery({
      search: req.query.search as string,
      searchFields: FAQ_SEARCH_FIELDS,
      enumFilters: {
        status: req.query.status !== "all" ? req.query.status : undefined,
      },
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    });

    // Override default sort to order by 'order' field if no sort specified
    if (!req.query.sortBy) {
      paginationParams.sortBy = "order";
      paginationParams.sortOrder = "asc";
    }

    // Execute paginated query
    const result = await PaginationHelper.paginate(
      Faq,
      query,
      paginationParams,
    );

    return ResponseHandler.success(
      res,
      {
        ...result,
        filters: {
          search: req.query.search || null,
          status: req.query.status || null,
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
    logger.error("List FAQs error:", error);
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
 * Get FAQ By ID Controller
 */
export const getFaqById = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { faqId } = req.params;

    const faq = await FaqService.getFaqById(faqId);
    return ResponseHandler.success(res, faq, "general.success", lang);
  } catch (error: any) {
    logger.error("Get FAQ error:", error);
    const lang = getLanguage(req);

    if (error.message === "error.faqNotFound") {
      return ResponseHandler.notFound(res, "faq.notFound", lang);
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
 * Update FAQ Controller
 */
export const updateFaq = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { faqId } = req.params;
    const userId = req.user?.sub;

    const faq = await FaqService.updateFaq(faqId, req.body, userId);
    return ResponseHandler.success(res, faq, "faq.updated", lang);
  } catch (error: any) {
    logger.error("Update FAQ error:", error);
    const lang = getLanguage(req);

    if (error.message === "error.faqNotFound") {
      return ResponseHandler.notFound(res, "faq.notFound", lang);
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
 * Update FAQ Status Controller
 */
export const updateFaqStatus = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const lang = getLanguage(req);
    const { faqId } = req.params;
    const { status } = req.body;
    const userId = req.user?.sub;

    const faq = await FaqService.updateFaqStatus(faqId, status, userId);
    return ResponseHandler.success(res, faq, "faq.statusUpdated", lang);
  } catch (error: any) {
    logger.error("Update FAQ status error:", error);
    const lang = getLanguage(req);

    if (error.message === "error.invalidStatusValue") {
      return ResponseHandler.validationError(
        res,
        { status: error.message },
        "validation.failed",
        lang,
      );
    }
    if (error.message === "error.faqNotFound") {
      return ResponseHandler.notFound(res, "faq.notFound", lang);
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
 * Delete FAQ Controller (Soft Delete)
 */
export const deleteFaq = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lang = getLanguage(req);
    const { faqId } = req.params;
    const userId = req.user?.sub;

    const faq = await FaqService.deleteFaq(faqId, userId);
    return ResponseHandler.success(res, faq, "faq.deleted", lang);
  } catch (error: any) {
    logger.error("Delete FAQ error:", error);
    const lang = getLanguage(req);

    if (error.message === "error.faqNotFound") {
      return ResponseHandler.notFound(res, "faq.notFound", lang);
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
 * List Public FAQs Controller (Public - All Active FAQs)
 * Endpoint: GET /api/v1/faqs
 * Returns all active FAQs without pagination, sorted by order
 */
export const listPublicFaqs = async (req: Request, res: Response) => {
  try {
    const { lang: queryLang } = req.query;

    // Use lang from query param if provided (validate it), otherwise get from headers
    let lang: "en" | "ar" | "hi" | undefined;
    if (queryLang && typeof queryLang === "string") {
      lang =
        queryLang === "en" || queryLang === "ar" || queryLang === "hi" ? queryLang : getLanguage(req);
    } else {
      lang = getLanguage(req);
    }

    const page = Math.max(1, Number.parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    let findQuery = Faq.find({ status: FaqStatus.ACTIVE }).sort({ order: 1 });
    if (typeof (findQuery as any).skip === "function") {
      findQuery = (findQuery as any).skip(skip);
    }
    if (typeof (findQuery as any).limit === "function") {
      findQuery = (findQuery as any).limit(limit);
    }

    // Get active FAQs with pagination, sorted by order (ascending)
    const [faqs, totalCount] = await Promise.all([
      findQuery.lean(),
      Faq.countDocuments ? Faq.countDocuments({ status: FaqStatus.ACTIVE }) : Promise.resolve(0),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;

    return ResponseHandler.success(
      res,
      {
        totalFaqs: totalCount,
        faqs,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      "general.success",
      lang
    );
  } catch (error) {
    logger.error("List public FAQs error:", error);
    const { lang: queryLang } = req.query;

    // Use lang from query param if provided (validate it), otherwise get from headers
    let lang: "en" | "ar" | "hi" | undefined;
    if (queryLang && typeof queryLang === "string") {
      lang =
        queryLang === "en" || queryLang === "ar" || queryLang === "hi" ? queryLang : getLanguage(req);
    } else {
      lang = getLanguage(req);
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
  createFaq,
  listFaqs,
  getFaqById,
  updateFaq,
  updateFaqStatus,
  deleteFaq,
  listPublicFaqs,
};
