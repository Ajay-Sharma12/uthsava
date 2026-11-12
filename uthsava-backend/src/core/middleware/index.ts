import express, { Express } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import session from "express-session";
import cookieParser from "cookie-parser";
import RedisStore from "connect-redis";
import { createClient } from "redis";
import path from "node:path";
import { config } from "../config";
import { logger } from "../constants/logger";
import i18n from "../config/i18n";

export const setupMiddlewares = (app: Express) => {
  logger.info("Setting up middlewares");

  // Static files service (logos, images, assets)
  app.use(
    express.static(path.join(__dirname, "../../..", "public"), {
      maxAge: "1d",
      etag: false,
    }),
  );

  // HTTP request logger
  if (config.nodeEnv === "development") {
    app.use(morgan("dev")); // Colored output for development
  } else {
    app.use(morgan("combined")); // Apache combined format for production
  }

  // Security middlewares
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));

  // Rate limiting for all APIs
  // app.use(apiRateLimiter);

  // i18n middleware
  app.use(i18n.init);

  app.use(cookieParser());

  if (config.redisUrl) {
    try {
      const redisClient = createClient({ url: config.redisUrl });

      redisClient.on("connect", () => {
        logger.info("✅ Redis connected successfully");
      });

      redisClient.on("error", (err) => {
        logger.error("Redis connection error:", err);
      });

      redisClient.connect().catch((err) => {
        logger.error("Failed to connect to Redis:", err);
      });

      const redisStore = new RedisStore({ client: redisClient });
      app.use(
        session({
          store: redisStore,
          secret: config.jwt.refreshSecret || "default_session_secret",
          resave: false,
          saveUninitialized: false,
          cookie: { secure: config.nodeEnv === "production", httpOnly: true },
        }),
      );
    } catch (err) {
      logger.error("Error setting up Redis session store:", err);
    }
  } else {
    logger.warn("REDIS_URL not configured. Using memory session store.");
    app.use(
      session({
        secret: config.jwt.refreshSecret || "default_session_secret",
        resave: false,
        saveUninitialized: false,
        cookie: { secure: config.nodeEnv === "production", httpOnly: true },
      }),
    );
  }
  // Increase payload limits to accommodate large media uploads (adjust as needed)
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ extended: true, limit: "100mb" }));
};
