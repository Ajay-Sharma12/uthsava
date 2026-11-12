import { Request, Response } from "express";
import { ResponseHandler } from "../../common/responses/response.handler";
import { getLanguage } from "../shared/helpers/language.helper";
import { logger } from "../../core/constants/logger";
import { HTTP_STATUS } from "../../core/constants/app.constants";
import {
  sendDailyReportReminders,
  sendDailyReportMissedNotifications,
} from "../shared/services/daily-report-reminder.service";

/**
 * Manually trigger a cron job
 * @body { type: 'reminder' | 'missed' }
 */
export const triggerCronJob = async (req: Request, res: Response) => {
  const lang = getLanguage(req);
  const { type } = req.body;

  try {
    if (!type || !["reminder", "missed"].includes(type)) {
      return ResponseHandler.error(
        res,
        'Invalid type. Use "reminder" or "missed".',
        lang,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    logger.info(`[CronTrigger] Manually triggering cron job: ${type}`);

    let result: { totalSent: number } = { totalSent: 0 };

    if (type === "reminder") {
      result = await sendDailyReportReminders();
    } else if (type === "missed") {
      result = await sendDailyReportMissedNotifications();
    }

    return ResponseHandler.success(
      res,
      {
        type,
        totalSent: result.totalSent,
        triggeredAt: new Date().toISOString(),
      },
      "general.success",
      lang,
    );
  } catch (error: any) {
    logger.error(`[CronTrigger] Error triggering cron job (${type}):`, error);
    return ResponseHandler.error(
      res,
      error.message || "Failed to trigger cron job",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
};
