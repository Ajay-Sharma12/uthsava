/// <reference types="jest" />

// ─── Mocks ───────────────────────────────────────────────────────────────────
const mockWorkerInstance = {
  on: jest.fn(),
};
const MockWorker = jest.fn().mockImplementation(() => mockWorkerInstance);

jest.mock("bullmq", () => ({
  Worker: MockWorker,
}));

jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  }));
});

jest.mock("../../../../src/core/config", () => ({
  config: {
    redisUrl: "redis://localhost:6379",
  },
}));

jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockSendMail = jest.fn();
jest.mock("../../../../src/modules/shared/services/mail.service", () => ({
  sendMail: mockSendMail,
}));

// ─── Imports ─────────────────────────────────────────────────────────────────
import { Worker, Job } from "bullmq";

const logger = jest.requireMock("../../../../src/core/constants/logger").logger as {
  info: jest.Mock;
  error: jest.Mock;
  warn: jest.Mock;
};

describe("Email Worker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should create a BullMQ Worker bound to the emailQueue", () => {
    jest.isolateModules(() => {
      require("../../../../src/modules/shared/workers/email.worker");
      expect(MockWorker).toHaveBeenCalledWith(
        "emailQueue",
        expect.any(Function),
        expect.objectContaining({ connection: expect.anything() })
      );
    });
  });

  it("[Positive] should register 'completed' and 'failed' event listeners", () => {
    jest.isolateModules(() => {
      require("../../../../src/modules/shared/workers/email.worker");
      expect(mockWorkerInstance.on).toHaveBeenCalledWith("completed", expect.any(Function));
      expect(mockWorkerInstance.on).toHaveBeenCalledWith("failed", expect.any(Function));
    });
  });

  it("[Positive] should process an email job by calling sendMail with correct args", async () => {
    mockSendMail.mockResolvedValue(undefined);

    jest.isolateModules(async () => {
      require("../../../../src/modules/shared/workers/email.worker");
      const processorFn = MockWorker.mock.calls[0][1];

      const mockJob = {
        id: "job-001",
        data: {
          to: "user@example.com",
          subject: "Test Subject",
          html: "<p>Hello</p>",
        },
      } as unknown as Job;

      await processorFn(mockJob);
      expect(mockSendMail).toHaveBeenCalledWith(
        "user@example.com",
        "Test Subject",
        "<p>Hello</p>"
      );
    });
  });

  it("[Positive] should log info when a job starts processing", async () => {
    mockSendMail.mockResolvedValue(undefined);

    jest.isolateModules(async () => {
      require("../../../../src/modules/shared/workers/email.worker");
      const processorFn = MockWorker.mock.calls[0][1];

      const mockJob = {
        id: "job-002",
        data: { to: "user@example.com", subject: "Sub", html: "<p>Hi</p>" },
      } as unknown as Job;

      await processorFn(mockJob);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("job-002")
      );
    });
  });

  it("[Positive] should log info on job completion via completed event", () => {
    jest.isolateModules(() => {
      require("../../../../src/modules/shared/workers/email.worker");
      const completedHandler = mockWorkerInstance.on.mock.calls.find(
        ([event]: [string]) => event === "completed"
      )?.[1];

      const mockJob = { id: "job-003" } as Job;
      completedHandler(mockJob);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("job-003")
      );
    });
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should rethrow error when sendMail fails", async () => {
    const mailError = new Error("SMTP server unreachable");
    mockSendMail.mockRejectedValue(mailError);

    jest.isolateModules(async () => {
      require("../../../../src/modules/shared/workers/email.worker");
      const processorFn = MockWorker.mock.calls[0][1];

      const mockJob = {
        id: "job-004",
        data: { to: "user@example.com", subject: "Sub", html: "<p>Hi</p>" },
      } as unknown as Job;

      await expect(processorFn(mockJob)).rejects.toThrow("SMTP server unreachable");
    });
  });

  it("[Negative] should log error on job failure via failed event", () => {
    jest.isolateModules(() => {
      require("../../../../src/modules/shared/workers/email.worker");
      const failedHandler = mockWorkerInstance.on.mock.calls.find(
        ([event]: [string]) => event === "failed"
      )?.[1];

      const mockJob = { id: "job-005" } as Job;
      const mockError = new Error("Connection refused");
      failedHandler(mockJob, mockError);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("job-005")
      );
    });
  });

  it("[Negative] should handle failed event with undefined job gracefully", () => {
    jest.isolateModules(() => {
      require("../../../../src/modules/shared/workers/email.worker");
      const failedHandler = mockWorkerInstance.on.mock.calls.find(
        ([event]: [string]) => event === "failed"
      )?.[1];

      expect(() => {
        failedHandler(undefined, new Error("Unknown error"));
      }).not.toThrow();
    });
  });

  /* =========================================================================
   * EDGE TEST CASES
   * ========================================================================= */
  it("[Edge] should use maxRetriesPerRequest: null in the Redis connection", () => {
    const Redis = require("ioredis");
    jest.isolateModules(() => {
      require("../../../../src/modules/shared/workers/email.worker");
      expect(Redis).toHaveBeenCalledWith(
        "redis://localhost:6379",
        expect.objectContaining({ maxRetriesPerRequest: null })
      );
    });
  });

  it("[Edge] should log error when sendMail fails before rethrowing", async () => {
    const mailError = new Error("Timeout");
    mockSendMail.mockRejectedValue(mailError);

    jest.isolateModules(async () => {
      require("../../../../src/modules/shared/workers/email.worker");
      const processorFn = MockWorker.mock.calls[0][1];

      const mockJob = {
        id: "job-006",
        data: { to: "user@example.com", subject: "Sub", html: "<p></p>" },
      } as unknown as Job;

      await processorFn(mockJob).catch(() => {});
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("job-006"),
        expect.anything()
      );
    });
  });
});
