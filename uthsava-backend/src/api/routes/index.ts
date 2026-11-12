import { Express } from "express";
import v1Routes from "./v1";
import { setupSwagger } from "../../config/swagger";

/**
 * Setup all API routes
 */
export const setupRoutes = (app: Express) => {
  // Swagger OpenAPI documentation UI
  setupSwagger(app);

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // API v1 routes
  app.use("/api/v1", v1Routes);
};

export default setupRoutes;

