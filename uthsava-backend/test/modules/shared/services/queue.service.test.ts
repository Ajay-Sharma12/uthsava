/// <reference types="jest" />
import { QueueService, emailQueue } from "../../../../src/modules/shared/services/queue.service";
import { logger } from "../../../../src/core/constants/logger";
import { sendMail } from "../../../../src/modules/shared/services/mail.service";

// Mock mail service
jest.mock("../../../../src/modules/shared/services/mail.service", () => ({
  sendMail: jest.fn().mockResolvedValue({ messageId: "fallback-id" }),
}));

// Mock ioredis before importing queue.service
jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => {
    return {};
  });
});

// Mock bullmq
jest.mock("bullmq", () => {
  const mockQueueInstance = {
    add: jest.fn(),
  };
  return {
    Queue: jest.fn().mockImplementation(() => mockQueueInstance),
  };
});

// Mock logger
jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("Queue Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should successfully add an email job to the queue with default options", async () => {
    const mockJob = { id: "job-123" };
    (emailQueue.add as jest.Mock).mockResolvedValue(mockJob);

    const jobData = {
      to: "recipient@test.com",
      subject: "Test Subject",
      html: "<h1>Test</h1>",
    };

    const result = await QueueService.addEmailJob("test-job", jobData);

    expect(emailQueue.add).toHaveBeenCalledWith(
      "test-job",
      jobData,
      expect.objectContaining({
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: true,
      })
    );
    expect(result).toEqual(mockJob);
  });

  it("[Positive] should merge and override options if custom options are passed", async () => {
    const mockJob = { id: "job-456" };
    (emailQueue.add as jest.Mock).mockResolvedValue(mockJob);

    const jobData = {
      to: "recipient@test.com",
      subject: "Test Subject",
      html: "<h1>Test</h1>",
    };

    const customOptions = {
      attempts: 5,
      delay: 5000,
    };

    const result = await QueueService.addEmailJob("test-job", jobData, customOptions);

    expect(emailQueue.add).toHaveBeenCalledWith(
      "test-job",
      jobData,
      expect.objectContaining({
        attempts: 5,
        delay: 5000,
        removeOnComplete: true,
      })
    );
    expect(result).toEqual(mockJob);
  });

  /* =========================================================================
   * NEGATIVE & EDGE TEST CASES
   * ========================================================================= */
  it("[Edge] should log warning and fallback to sendMail when emailQueue.add fails", async () => {
    const queueError = new Error("Redis connection timed out");
    (emailQueue.add as jest.Mock).mockRejectedValue(queueError);
    (sendMail as jest.Mock).mockResolvedValue({ messageId: "fallback-id" });

    const jobData = {
      to: "recipient@test.com",
      subject: "Test Subject",
      html: "<h1>Test</h1>",
    };

    const result = await QueueService.addEmailJob("test-job", jobData);

    expect(logger.warn).toHaveBeenCalledWith(
      "[QueueService] BullMQ enqueue failed (Redis connection timed out). Falling back to direct email send."
    );
    expect(sendMail).toHaveBeenCalledWith(jobData.to, jobData.subject, jobData.html);
    expect(result).toEqual({ messageId: "fallback-id" });
  });
});
