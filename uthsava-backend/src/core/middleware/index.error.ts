import { Express } from "express";
import { errorHandler } from "./errorHandler";

export const setupErrorHandling = (app: Express) => {
  app.use(errorHandler);
};
