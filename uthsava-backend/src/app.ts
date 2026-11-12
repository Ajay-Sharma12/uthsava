import express from "express";
import { config } from "./core/config";
import { setupMiddlewares } from "./core/middleware";
import { setupRoutes } from "./api/routes";
import { connectDatabase } from "./core/database/connection";
import { logger } from "./core/constants/logger";
import { setupErrorHandling } from "./core/middleware/index.error";
import { initCronJobs } from "./modules/cron/cron.scheduler";
import "./modules/shared/workers/email.worker"; // Initialize email worker

const app = express();

if (config.nodeEnv !== "development") {
  app.set("trust proxy", 1);
}

logger.info("Initializing Express application");

setupMiddlewares(app);
logger.info("Middlewares configured");

setupRoutes(app);
logger.info("Routes configured");

setupErrorHandling(app);
logger.info("Error handling configured");

const startServer = async () => {
  try {
    logger.info("Attempting to connect to database...");
    await connectDatabase();
    logger.info("Database connection complete");

    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);

      // Initialize cron jobs after server starts
      initCronJobs();
    });
  } catch (err) {
    logger.error("Failed to start server", err);
    process.exit(1);
  }
};

startServer();
