/// <reference types="jest" />
import cron from "node-cron";
import { initCronJobs } from "../../../src/modules/cron/cron.scheduler";
import {
  sendDailyReportReminders,
  sendDailyReportMissedNotifications,
} from "../../../src/modules/shared/services/daily-report-reminder.service";
import { sendSubscriptionExpiryReminders } from "../../../src/modules/shared/services/subscription-reminder.service";
import { sendCouponExpiryReminders } from "../../../src/modules/shared/services/coupon-reminder.service";
import { logger } from "../../../src/core/constants/logger";

// Mock dependencies
jest.mock("node-cron");
jest.mock("../../../src/modules/shared/services/daily-report-reminder.service");
jest.mock("../../../src/modules/shared/services/subscription-reminder.service");
jest.mock("../../../src/modules/shared/services/coupon-reminder.service");
jest.mock("../../../src/core/constants/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe("Cron Scheduler Tests", () => {
  let scheduledCallbacks: { [key: string]: Function[] } = {};

  beforeEach(() => {
    jest.clearAllMocks();
    scheduledCallbacks = {};
    
    // Capture the registered callbacks for each cron expression
    (cron.schedule as jest.Mock).mockImplementation((expression: string, cb: Function, options: any) => {
      if (!scheduledCallbacks[expression]) {
        scheduledCallbacks[expression] = [];
      }
      scheduledCallbacks[expression].push(cb);
      return { start: jest.fn() };
    });
  });

  // ==========================================
  // Positive Cases (Job registration & execution)
  // ==========================================
  describe("initCronJobs registration and success path", () => {
    it("should register all expected cron jobs with correct expressions", () => {
      initCronJobs();

      expect(logger.info).toHaveBeenCalledWith("[CronJobs] Initializing scheduled tasks...");
      expect(cron.schedule).toHaveBeenCalledTimes(5);

      // Verify each cron expression was registered
      expect(scheduledCallbacks["0 21 * * *"]).toBeDefined(); // Daily report reminder
      expect(scheduledCallbacks["0 0 * * *"]).toBeDefined();  // Midnight tasks
      expect(scheduledCallbacks["0 10 * * *"]).toBeDefined(); // 10 AM Coupon reminder
      expect(logger.info).toHaveBeenCalledWith("[CronJobs] All scheduled tasks registered successfully.");
    });

    it("should successfully trigger daily report reminders at 9:00 PM", async () => {
      initCronJobs();
      
      const callback9PM = scheduledCallbacks["0 21 * * *"][0];
      (sendDailyReportReminders as jest.Mock).mockResolvedValue({ totalSent: 5 });

      await callback9PM();

      expect(sendDailyReportReminders).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith("[CronJobs] 9 PM daily report reminder completed.");
    });

    it("should successfully trigger missed report notification at midnight", async () => {
      initCronJobs();
      
      // Note: "0 0 * * *" has multiple jobs registered (Missed, Coupon expiry, Subscription expiry)
      const callbackMidnightMissed = scheduledCallbacks["0 0 * * *"][0];
      (sendDailyReportMissedNotifications as jest.Mock).mockResolvedValue({ totalSent: 2 });

      await callbackMidnightMissed();

      expect(sendDailyReportMissedNotifications).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith("[CronJobs] Midnight missed report notification completed.");
    });

    it("should successfully trigger coupon expiry reminders at midnight", async () => {
      initCronJobs();
      
      const callbackMidnightCoupon = scheduledCallbacks["0 0 * * *"][1];
      (sendCouponExpiryReminders as jest.Mock).mockResolvedValue({ totalSent: 3 });

      await callbackMidnightCoupon();

      expect(sendCouponExpiryReminders).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith("[CronJobs] Coupon expiry reminder completed.");
    });

    it("should successfully trigger subscription expiry reminders at midnight", async () => {
      initCronJobs();
      
      const callbackMidnightSubscription = scheduledCallbacks["0 0 * * *"][2];
      (sendSubscriptionExpiryReminders as jest.Mock).mockResolvedValue({ totalSent: 10 });

      await callbackMidnightSubscription();

      expect(sendSubscriptionExpiryReminders).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith("[CronJobs] Subscription expiry reminder completed.");
    });

    it("should successfully trigger general coupon reminders at 10:00 AM", async () => {
      initCronJobs();
      
      const callback10AMCoupon = scheduledCallbacks["0 10 * * *"][0];
      (sendCouponExpiryReminders as jest.Mock).mockResolvedValue({ totalSent: 4 });

      await callback10AMCoupon();

      expect(sendCouponExpiryReminders).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith("[CronJobs] Coupon reminders completed.");
    });
  });

  // ==========================================
  // Negative / Error Handling Cases
  // ==========================================
  describe("Cron job error handling", () => {
    it("should handle error when sendDailyReportReminders fails", async () => {
      initCronJobs();
      
      const callback9PM = scheduledCallbacks["0 21 * * *"][0];
      const error = new Error("SMTP connection failed");
      (sendDailyReportReminders as jest.Mock).mockRejectedValue(error);

      await callback9PM();

      expect(logger.error).toHaveBeenCalledWith("[CronJobs] 9 PM daily report reminder failed:", error);
    });

    it("should handle error when sendDailyReportMissedNotifications fails", async () => {
      initCronJobs();
      
      const callbackMidnightMissed = scheduledCallbacks["0 0 * * *"][0];
      const error = new Error("DB Query timeout");
      (sendDailyReportMissedNotifications as jest.Mock).mockRejectedValue(error);

      await callbackMidnightMissed();

      expect(logger.error).toHaveBeenCalledWith("[CronJobs] Midnight missed report notification failed:", error);
    });

    it("should handle error when sendCouponExpiryReminders fails at midnight", async () => {
      initCronJobs();
      
      const callbackMidnightCoupon = scheduledCallbacks["0 0 * * *"][1];
      const error = new Error("API Failure");
      (sendCouponExpiryReminders as jest.Mock).mockRejectedValue(error);

      await callbackMidnightCoupon();

      expect(logger.error).toHaveBeenCalledWith("[CronJobs] Coupon expiry reminder failed:", error);
    });

    it("should handle error when sendSubscriptionExpiryReminders fails", async () => {
      initCronJobs();
      
      const callbackMidnightSubscription = scheduledCallbacks["0 0 * * *"][2];
      const error = new Error("Unexpected crash");
      (sendSubscriptionExpiryReminders as jest.Mock).mockRejectedValue(error);

      await callbackMidnightSubscription();

      expect(logger.error).toHaveBeenCalledWith("[CronJobs] Subscription expiry reminder failed:", error);
    });

    it("should handle error when sendCouponExpiryReminders fails at 10 AM", async () => {
      initCronJobs();
      
      const callback10AMCoupon = scheduledCallbacks["0 10 * * *"][0];
      const error = new Error("Redis key expired");
      (sendCouponExpiryReminders as jest.Mock).mockRejectedValue(error);

      await callback10AMCoupon();

      expect(logger.error).toHaveBeenCalledWith("[CronJobs] Coupon reminders failed:", error);
    });
  });
});
