import { Request, Response, NextFunction } from "express";
import { logger } from "../constants/logger";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  logger.error(err.message, { stack: err.stack });
  res
    .status(err.status || 500)
    .json({ message: err.message || "Internal Server Error" });
};
