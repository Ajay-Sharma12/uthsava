import cron from "node-cron";
import { logger } from "../../core/constants/logger";
import {
  sendDailyReportReminders,
  sendDailyReportMissedNotifications,
} from "../shared/services/daily-report-reminder.service";
import { sendSubscriptionExpiryReminders } from "../shared/services/subscription-reminder.service";
import { sendCouponExpiryReminders } from "../shared/services/coupon-reminder.service";

/**
 * Cron Job Scheduler
 * Registers all scheduled tasks for the application.
 *
 * Schedule format: minute hour day-of-month month day-of-week
 */
export const initCronJobs = (): void => {
  logger.info("[CronJobs] Initializing scheduled tasks...");

  /**
   * 9:00 PM Daily - Daily Report Reminder
   * Cron: 0 21 * * * (At 21:00 every day)
   */
  cron.schedule(
    "0 21 * * *",
    async () => {
      logger.info("[CronJobs] Triggering 9 PM daily report reminder...");
      try {
        await sendDailyReportReminders();
        logger.info("[CronJobs] 9 PM daily report reminder completed.");
      } catch (error) {
        logger.error("[CronJobs] 9 PM daily report reminder failed:", error);
      }
    },
    {
      timezone: "Asia/Kolkata",
    },
  );

  /**
   * 12:00 AM Daily - Missed Report Notification
   * Cron: 0 0 * * * (At 00:00 every day)
   */
  cron.schedule(
    "0 0 * * *",
    async () => {
      logger.info("[CronJobs] Triggering midnight missed report notification...");
      try {
        await sendDailyReportMissedNotifications();
        logger.info("[CronJobs] Midnight missed report notification completed.");
      } catch (error) {
        logger.error("[CronJobs] Midnight missed report notification failed:", error);
      }
    },
    {
      timezone: "Asia/Kolkata",
    },
  );

  /**
   * 12:00 AM Daily - Coupon Expiry Reminder
   * Cron: 0 0 * * *
   * Checks coupons expiring in 1 day and already expired coupons
   */
  cron.schedule(
    "0 0 * * *",
    async () => {
      logger.info("[CronJobs] Triggering coupon expiry reminder...");
      try {
        await sendCouponExpiryReminders();
        logger.info("[CronJobs] Coupon expiry reminder completed.");
      } catch (error) {
        logger.error("[CronJobs] Coupon expiry reminder failed:", error);
      }
    },
    {
      timezone: "Asia/Kolkata",
    },
  );

  /**
   * 12:00 AM Daily - Subscription Expiry Reminder
   * Cron: 0 0 * * * (At 12:00 AM every day)
   * Checks subscriptions expiring in 7, 3, and 1 days, and expired
   */
  cron.schedule(
    "0 0 * * *",
    async () => {
      logger.info("[CronJobs] Triggering subscription expiry reminder...");
      try {
        await sendSubscriptionExpiryReminders();
        logger.info("[CronJobs] Subscription expiry reminder completed.");
      } catch (error) {
        logger.error("[CronJobs] Subscription expiry reminder failed:", error);
      }
    },
    {
      timezone: "Asia/Kolkata",
    },
  );

  /**
   * 10:00 AM Daily - Coupon Reminders
   * Cron: 0 10 * * * (At 10:00 every day)
   */
  cron.schedule(
    "0 10 * * *",
    async () => {
      logger.info("[CronJobs] Triggering coupon reminders...");
      try {
        await sendCouponExpiryReminders();
        logger.info("[CronJobs] Coupon reminders completed.");
      } catch (error) {
        logger.error("[CronJobs] Coupon reminders failed:", error);
      }
    },
    {
      timezone: "Asia/Kolkata",
    },
  );

  logger.info("[CronJobs] All scheduled tasks registered successfully.");
  logger.info("[CronJobs] - 12:00 AM : Subscription expiry reminder");
  logger.info("[CronJobs] - 9:00 PM : Daily report reminder");
  logger.info("[CronJobs] - 12:00 AM: Missed report notification & Coupon expiry reminder");
};