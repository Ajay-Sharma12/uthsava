/// <reference types="jest" />
import { Request, Response } from "express";
import { triggerCronJob } from "../../../src/modules/cron/cron.controller";
import { ResponseHandler } from "../../../src/common/responses/response.handler";
import {
  sendDailyReportReminders,
  sendDailyReportMissedNotifications,
} from "../../../src/modules/shared/services/daily-report-reminder.service";
import { HTTP_STATUS } from "../../../src/core/constants/app.constants";

// Mock dependencies
jest.mock("../../../src/common/responses/response.handler");
jest.mock("../../../src/modules/shared/services/daily-report-reminder.service");
jest.mock("../../../src/modules/shared/helpers/language.helper", () => ({
  getLanguage: jest.fn().mockReturnValue("en"),
}));
jest.mock("../../../src/core/constants/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (body: any = {}) => {
  return {
    body,
  } as unknown as Request;
};

describe("Cron Controller Tests", () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
  });

  // ==========================================
  // Positive Cases
  // ==========================================
  describe("triggerCronJob positive path", () => {
    it("should successfully trigger daily report reminders manually", async () => {
      req = mockRequest({ type: "reminder" });
      (sendDailyReportReminders as jest.Mock).mockResolvedValue({ totalSent: 15 });

      await triggerCronJob(req, res);

      expect(sendDailyReportReminders).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          type: "reminder",
          totalSent: 15,
          triggeredAt: expect.any(String),
        }),
        "general.success",
        "en"
      );
    });

    it("should successfully trigger daily report missed notifications manually", async () => {
      req = mockRequest({ type: "missed" });
      (sendDailyReportMissedNotifications as jest.Mock).mockResolvedValue({ totalSent: 7 });

      await triggerCronJob(req, res);

      expect(sendDailyReportMissedNotifications).toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          type: "missed",
          totalSent: 7,
          triggeredAt: expect.any(String),
        }),
        "general.success",
        "en"
      );
    });
  });

  // ==========================================
  // Validation Cases
  // ==========================================
  describe("triggerCronJob validation path", () => {
    it("should return bad request error if type is missing", async () => {
      req = mockRequest({}); // No type in body

      await triggerCronJob(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        'Invalid type. Use "reminder" or "missed".',
        "en",
        HTTP_STATUS.BAD_REQUEST
      );
      expect(sendDailyReportReminders).not.toHaveBeenCalled();
      expect(sendDailyReportMissedNotifications).not.toHaveBeenCalled();
    });

    it("should return bad request error if type is invalid", async () => {
      req = mockRequest({ type: "invalid_type" });

      await triggerCronJob(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        'Invalid type. Use "reminder" or "missed".',
        "en",
        HTTP_STATUS.BAD_REQUEST
      );
      expect(sendDailyReportReminders).not.toHaveBeenCalled();
      expect(sendDailyReportMissedNotifications).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // Negative Cases / Error Handling
  // ==========================================
  describe("triggerCronJob error path", () => {
    it("should return internal server error if service execution throws an error", async () => {
      req = mockRequest({ type: "reminder" });
      const mockError = new Error("Database timeout");
      (sendDailyReportReminders as jest.Mock).mockRejectedValue(mockError);

      await triggerCronJob(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "Database timeout",
        "en",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    });

    it("should return generic error message if error has no message field", async () => {
      req = mockRequest({ type: "missed" });
      (sendDailyReportMissedNotifications as jest.Mock).mockRejectedValue({});

      await triggerCronJob(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        res,
        "Failed to trigger cron job",
        "en",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    });
  });
});
