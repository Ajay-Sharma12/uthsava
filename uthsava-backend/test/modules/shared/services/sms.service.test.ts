/// <reference types="jest" />
import { sendSms, sendBulkSms } from "../../../../src/modules/shared/services/sms.service";
import { logger } from "../../../../src/core/constants/logger";

jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("SMS Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should successfully send a single SMS with valid input", async () => {
    const to = "+919876543210";
    const message = "Test SMS Message";
    const result = await sendSms(to, message);

    expect(result.success).toBe(true);
    expect(result.to).toBe(to);
    expect(result.messageId).toContain("stub-");
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`Sending to ${to}: ${message}`));
  });

  it("[Positive] should successfully send bulk SMS with multiple recipients", async () => {
    const recipients = ["+919876543210", "+919876543211"];
    const message = "Bulk SMS Message";
    const result = await sendBulkSms(recipients, message);

    expect(result.total).toBe(2);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(0);
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail single SMS if recipient (to) is missing", async () => {
    const result = await sendSms("", "Test Message");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Recipient number and message are required");
  });

  it("[Negative] should fail single SMS if message is missing", async () => {
    const result = await sendSms("+919876543210", "");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Recipient number and message are required");
  });

  /* =========================================================================
   * EDGE TEST CASES
   * ========================================================================= */
  it("[Edge] should return zero counts immediately when sending bulk SMS with empty recipients list", async () => {
    const result = await sendBulkSms([], "Hello");
    expect(result).toEqual({ total: 0, succeeded: 0, failed: 0 });
  });

  it("[Edge] should handle internal exceptions gracefully and log the error", async () => {
    // Force sendSms to throw an error by mocking logger.info to throw
    (logger.info as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Log output stream full");
    });

    const result = await sendSms("+919876543210", "Fail Test");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Log output stream full");
    expect(logger.error).toHaveBeenCalled();
  });
});
