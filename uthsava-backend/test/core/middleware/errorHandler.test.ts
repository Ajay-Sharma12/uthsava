/// <reference types="jest" />
import { Request, Response, NextFunction } from "express";
import { errorHandler } from "../../../src/core/middleware/errorHandler";
import { logger } from "../../../src/core/constants/logger";

// Mock logger
jest.mock("../../../src/core/constants/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe("Error Handler Middleware Unit Tests", () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  const mockResponse = () => {
    const response: any = {};
    response.status = jest.fn().mockReturnValue(response);
    response.json = jest.fn().mockReturnValue(response);
    return response as Response;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
    req = {} as Request;
    next = jest.fn();
  });

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should log error and send response with custom status and message", () => {
    const err = {
      status: 400,
      message: "Bad request parameters",
      stack: "error stack trace",
    };

    errorHandler(err, req, res, next);

    expect(logger.error).toHaveBeenCalledWith("Bad request parameters", { stack: "error stack trace" });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Bad request parameters" });
  });

  it("[Positive] should use custom 404 status from error object", () => {
    const err = { status: 404, message: "Not Found" };

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Not Found" });
  });

  it("[Positive] should use custom 403 status from error object", () => {
    const err = { status: 403, message: "Forbidden" };

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fallback to 500 when err.status is not set", () => {
    const err = { message: "Something unexpected happened" };

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Something unexpected happened" });
  });

  it("[Negative] should not call next() after handling the error", () => {
    const err = { status: 500, message: "Server error" };

    errorHandler(err, req, res, next);

    expect(next).not.toHaveBeenCalled();
  });

  /* =========================================================================
   * EDGE TEST CASES
   * ========================================================================= */
  it("[Edge] should fallback to 500 and 'Internal Server Error' if status and message are not provided", () => {
    const err = new Error();
    err.stack = "generic stack trace";

    errorHandler(err, req, res, next);

    expect(logger.error).toHaveBeenCalledWith("", { stack: "generic stack trace" });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Internal Server Error" });
  });

  it("[Edge] should use err.message even when it is an empty string (fallback message in json)", () => {
    const err = { status: 400, message: "" };

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Internal Server Error" });
  });

  it("[Edge] should log the error with stack when available", () => {
    const err = { status: 500, message: "Internal error", stack: "at line 10..." };

    errorHandler(err, req, res, next);

    expect(logger.error).toHaveBeenCalledWith("Internal error", { stack: "at line 10..." });
  });

  it("[Edge] should handle err without a stack property", () => {
    const err = { status: 422, message: "Validation error" };

    errorHandler(err, req, res, next);

    expect(logger.error).toHaveBeenCalledWith("Validation error", { stack: undefined });
    expect(res.status).toHaveBeenCalledWith(422);
  });
});

