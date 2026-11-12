import { logger } from "../../../core/constants/logger";

/** Cron hook: no reminders are sent in this template build. */
export async function sendDailyReportReminders(): Promise<{
  totalSent: number;
}> {
  logger.info("[DailyReportReminder] No-op.");
  return { totalSent: 0 };
}

/** Cron hook: no missed-report notifications in this template build. */
export async function sendDailyReportMissedNotifications(): Promise<{
  totalSent: number;
}> {
  logger.info("[DailyReportMissed] No-op.");
  return { totalSent: 0 };
}
