import mongoose from "mongoose";
import { config } from "../config";
import { logger } from "../constants/logger";

export const connectDatabase = async () => {
  if (!config.mongoUri) {
    logger.warn("MONGO_URI not configured. Skipping MongoDB connection.");
    throw new Error(
      "MONGO_URI environment variable is required. Please configure MongoDB connection string.",
    );
  }
  try {
    await mongoose.connect(config.mongoUri);
    const safeUri = (() => {
      const slashIdx = config.mongoUri.indexOf("//");
      const atIdx = config.mongoUri.indexOf("@", slashIdx);
      if (slashIdx === -1 || atIdx === -1) return "***";
      return (
        config.mongoUri.slice(0, slashIdx + 2) +
        "***:***" +
        config.mongoUri.slice(atIdx)
      );
    })();
    logger.info("MongoDB connected", { mongoUri: safeUri });
  } catch (err) {
    logger.error("MongoDB connection error", err);
    throw new Error(
      `Failed to connect to MongoDB: ${err instanceof Error ? err.message : "Unknown error"}`,
    );
  }
};
