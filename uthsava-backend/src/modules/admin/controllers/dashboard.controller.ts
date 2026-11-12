import { Request, Response } from "express";
import { ResponseHandler } from "../../../common/responses/response.handler";
import { getLanguage } from "../../shared/helpers/language.helper";
import { DashboardService } from "../services/dashboard.service";
import { logger } from "../../../core/constants/logger";
import { HTTP_STATUS } from "../../../core/constants/app.constants";

/**
 * Get Dashboard Statistics
 * @route GET /api/v1/admin/dashboard/stats
 * @query fromDate - Optional start date (YYYY-MM-DD or DD/MM/YYYY)
 * @query toDate - Optional end date (YYYY-MM-DD or DD/MM/YYYY)
 */
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);
    let fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    let toDate = typeof req.query.toDate === "string" ? req.query.toDate : undefined;

    // Convert DD/MM/YYYY to YYYY-MM-DD format if needed
    const convertToISODate = (dateStr: string): string => {
      if (!dateStr) return dateStr;

      // Check if date is in DD/MM/YYYY format
      if (dateStr.includes("/")) {
        const parts = dateStr.split("/");
        if (parts.length === 3) {
          const [day, month, year] = parts;
          return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }
      }

      return dateStr;
    };

    // Convert dates if provided
    if (fromDate) {
      fromDate = convertToISODate(fromDate);
    }
    if (toDate) {
      toDate = convertToISODate(toDate);
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (fromDate && !dateRegex.test(fromDate)) {
      return ResponseHandler.badRequest(
        res, "error.invalidFromdateFormatUseDdmmyyyyOrYyyymmdd",
        lang,
      );
    }
    if (toDate && !dateRegex.test(toDate)) {
      return ResponseHandler.badRequest(
        res, "error.invalidTodateFormatUseDdmmyyyyOrYyyymmdd",
        lang,
      );
    }

    // Validate date logic
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      if (from > to) {
        return ResponseHandler.badRequest(
          res, "error.fromdateCannotBeAfterTodate",
          lang,
        );
      }
    }

    const stats = await DashboardService.getDashboardStats(fromDate, toDate);

    return ResponseHandler.success(
      res,
      stats,
      "Dashboard statistics retrieved successfully",
      lang,
    );
  } catch (error) {
    logger.error("Get dashboard stats error:", error);
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

export default {
  getDashboardStats,
};
