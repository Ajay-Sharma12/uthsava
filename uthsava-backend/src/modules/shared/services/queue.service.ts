import { Queue } from "bullmq";
import { config } from "../../../core/config";
import { logger } from "../../../core/constants/logger";
import { sendMail } from "./mail.service";
import Redis from "ioredis";

// Reuse the ioredis connection options for BullMQ
const connection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

connection?.on?.("error", () => {
  // Suppress unhandled redis connection errors for local older redis versions
});

export const emailQueue = new Queue("emailQueue", {
  connection: connection as any,
  skipVersionCheck: true,
});

export const QueueService = {
  /**
   * Add an email job to the queue, with automatic fallback to direct mail send
   */
  async addEmailJob(
    jobName: string,
    data: {
      to: string;
      subject: string;
      html: string;
    },
    options?: any,
  ) {
    try {
      return await emailQueue.add(jobName, data, {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: 100, // Keep last 100 failed jobs for debugging
        ...options,
      });
    } catch (error: any) {
      logger.warn(
        `[QueueService] BullMQ enqueue failed (${error?.message}). Falling back to direct email send.`,
      );
      return await sendMail(data.to, data.subject, data.html);
    }
  },
};
