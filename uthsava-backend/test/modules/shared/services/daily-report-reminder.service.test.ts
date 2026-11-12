/// <reference types="jest" />
import { sendDailyReportReminders, sendDailyReportMissedNotifications } from "../../../../src/modules/shared/services/daily-report-reminder.service";
import { logger } from "../../../../src/core/constants/logger";

jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("Daily Report Reminder Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should run sendDailyReportReminders and return totalSent 0", async () => {
    const result = await sendDailyReportReminders();
    expect(result).toEqual({ totalSent: 0 });
    expect(logger.info).toHaveBeenCalledWith("[DailyReportReminder] No-op.");
  });

  it("[Positive] should run sendDailyReportMissedNotifications and return totalSent 0", async () => {
    const result = await sendDailyReportMissedNotifications();
    expect(result).toEqual({ totalSent: 0 });
    expect(logger.info).toHaveBeenCalledWith("[DailyReportMissed] No-op.");
  });

  /* =========================================================================
   * NEGATIVE & EDGE TEST CASES
   * ========================================================================= */
  it("[Edge] should verify return structure is always compliant even under mock modifications", async () => {
    const resultReminders = await sendDailyReportReminders();
    const resultMissed = await sendDailyReportMissedNotifications();
    expect(resultReminders).toHaveProperty("totalSent");
    expect(typeof resultReminders.totalSent).toBe("number");
    expect(resultMissed).toHaveProperty("totalSent");
    expect(typeof resultMissed.totalSent).toBe("number");
  });
});
