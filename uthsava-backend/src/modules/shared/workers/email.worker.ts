import { Worker, Job } from "bullmq";
import { config } from "../../../core/config";
import { logger } from "../../../core/constants/logger";
import { sendMail } from "../services/mail.service";
import Redis from "ioredis";

// Reuse the ioredis connection options for BullMQ
const connection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

connection.on("error", () => {
  // Suppress unhandled redis connection errors for local older redis versions
});

export const emailWorker = new Worker(
  "emailQueue",
  async (job: Job) => {
    logger.info(`Processing email job ${job.id}`);
    const { to, subject, html } = job.data;

    try {
      await sendMail(to, subject, html);
      logger.info(`Successfully processed email job ${job.id} for ${to}`);
    } catch (error: any) {
      logger.error(`Failed to process email job ${job.id} for ${to}:`, error);
      throw error; // Let BullMQ handle retries
    }
  },
  {
    connection: connection as any,
    skipVersionCheck: true,
  },
);

let isWorkerDisabled = false;

emailWorker.on("error", (err: Error) => {
  if (
    err.message.includes("Unknown Redis command") ||
    err.message.includes("Lua script") ||
    err.message.includes("greater or equal than 5.0.0")
  ) {
    if (!isWorkerDisabled) {
      isWorkerDisabled = true;
      logger.warn(
        "⚠️ Local Redis server (v3.0) does not support BullMQ stream commands. BullMQ worker is disabled; emails will be sent directly via SMTP.",
      );
      emailWorker.close().catch(() => {});
    }
    return;
  }
  logger.warn(`[BullMQ Worker Notice] ${err.message}`);
});

emailWorker.on("completed", (job: Job) => {
  logger.info(`Email job ${job.id} has completed!`);
});

emailWorker.on("failed", (job: Job | undefined, err: Error) => {
  logger.error(`Email job ${job?.id} has failed with ${err.message}`);
});
