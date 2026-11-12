/// <reference types="jest" />
import { NotificationDispatcher } from "../../../../src/modules/shared/services/notification-dispatcher.service";
import { EmailTemplate } from "../../../../src/models/email-template.model";
import { QueueService } from "../../../../src/modules/shared/services/queue.service";
import { logger } from "../../../../src/core/constants/logger";

// Mock EmailTemplate model
jest.mock("../../../../src/models/email-template.model", () => ({
  EmailTemplate: {
    findOne: jest.fn(),
  },
}));

// Mock QueueService
jest.mock("../../../../src/modules/shared/services/queue.service", () => ({
  QueueService: {
    addEmailJob: jest.fn(),
  },
}));

// Mock logger
jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("Notification Dispatcher Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should successfully dispatch an email replacing custom placeholders and platform names", async () => {
    const mockTemplate = {
      subject: "Welcome to {{Platform Name}}! Dear {{userName}}",
      description: "Hello {{userName}}, your code is {{code}}. Enjoy {{site_name}}!",
    };
    (EmailTemplate.findOne as jest.Mock).mockResolvedValue(mockTemplate);
    (QueueService.addEmailJob as jest.Mock).mockResolvedValue({ id: "job-abc" });

    await NotificationDispatcher.dispatchEmail(
      "user@test.com",
      "user123",
      "WELCOME_KEYWORD",
      { userName: "Alice", code: "9999" }
    );

    expect(EmailTemplate.findOne).toHaveBeenCalledWith({ keyword: "WELCOME_KEYWORD" });
    expect(QueueService.addEmailJob).toHaveBeenCalledWith(
      expect.stringContaining("email-WELCOME_KEYWORD-user123-"),
      expect.objectContaining({
        to: "user@test.com",
        subject: "Welcome to Uthsava! Dear Alice",
        html: "Hello Alice, your code is 9999. Enjoy Uthsava!",
      })
    );
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("Enqueued email job:"));
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should return early and log a warning if userEmail is not provided", async () => {
    await NotificationDispatcher.dispatchEmail(
      "",
      "user123",
      "WELCOME_KEYWORD",
      {}
    );

    expect(EmailTemplate.findOne).not.toHaveBeenCalled();
    expect(QueueService.addEmailJob).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith("No email provided for dispatchEmail for keyword: WELCOME_KEYWORD");
  });

  it("[Negative] should return early and log a warning if email template is not found in database", async () => {
    (EmailTemplate.findOne as jest.Mock).mockResolvedValue(null);

    await NotificationDispatcher.dispatchEmail(
      "user@test.com",
      "user123",
      "MISSING_KEYWORD",
      {}
    );

    expect(EmailTemplate.findOne).toHaveBeenCalledWith({ keyword: "MISSING_KEYWORD" });
    expect(QueueService.addEmailJob).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      "Email template with keyword MISSING_KEYWORD not found. Ensure it exists in the database."
    );
  });

  /* =========================================================================
   * EDGE TEST CASES
   * ========================================================================= */
  it("[Edge] should fallback to default subject and empty description if fields are missing in template document", async () => {
    const mockTemplate = {
      subject: undefined,
      description: undefined,
    };
    (EmailTemplate.findOne as jest.Mock).mockResolvedValue(mockTemplate);

    await NotificationDispatcher.dispatchEmail(
      "user@test.com",
      "user123",
      "MINIMAL_KEYWORD",
      {}
    );

    expect(QueueService.addEmailJob).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        to: "user@test.com",
        subject: "Uthsava Notification",
        html: "",
      })
    );
  });

  it("[Edge] should handle exceptions thrown inside dispatchEmail by logging them gracefully", async () => {
    const dbError = new Error("Database offline");
    (EmailTemplate.findOne as jest.Mock).mockRejectedValue(dbError);

    await NotificationDispatcher.dispatchEmail(
      "user@test.com",
      "user123",
      "WELCOME_KEYWORD",
      {}
    );

    expect(logger.error).toHaveBeenCalledWith(
      "Error dispatching email for WELCOME_KEYWORD:",
      dbError
    );
  });
});
