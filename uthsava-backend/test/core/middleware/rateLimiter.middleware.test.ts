/// <reference types="jest" />
import { Request, Response, NextFunction } from "express";
import { ResponseHandler } from "../../../src/common/responses/response.handler";
import { getLanguage } from "../../../src/modules/shared/helpers/language.helper";

// Mock express-rate-limit so it returns the configuration options directly
jest.mock("express-rate-limit", () => {
  return jest.fn().mockImplementation((options) => {
    return options; // This exposes the config object directly as the middleware variable for testing
  });
});

// Mock ResponseHandler
jest.mock("../../../src/common/responses/response.handler", () => ({
  ResponseHandler: {
    rateLimitExceeded: jest.fn(),
  },
}));

// Mock language helper
jest.mock("../../../src/modules/shared/helpers/language.helper", () => ({
  getLanguage: jest.fn(),
}));

import {
  loginRateLimiter,
  apiRateLimiter,
  forgotPasswordRateLimiter,
  strictRateLimiter,
} from "../../../src/core/middleware/rateLimiter.middleware";

describe("Rate Limiter Middleware Unit Tests", () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      ip: "127.0.0.1",
    } as unknown as Request;
    res = {} as Response;
    next = jest.fn();
  });

  /* =========================================================================
   * CONFIGURATION VALIDATION TESTS
   * ========================================================================= */
  it("[Positive] should verify loginRateLimiter has correct configuration", () => {
    const config = loginRateLimiter as any;
    expect(config.windowMs).toBe(2 * 60 * 1000);
    expect(config.max).toBe(10);
    expect(config.skipSuccessfulRequests).toBe(true);
    expect(config.standardHeaders).toBe(true);
  });

  it("[Positive] should verify apiRateLimiter has correct configuration", () => {
    const config = apiRateLimiter as any;
    expect(config.windowMs).toBe(15 * 60 * 1000);
    expect(config.max).toBe(100);
  });

  it("[Positive] should verify strictRateLimiter has correct configuration", () => {
    const config = strictRateLimiter as any;
    expect(config.windowMs).toBe(60 * 60 * 1000);
    expect(config.max).toBe(10);
  });

  /* =========================================================================
   * HANDLER EXECUTION TESTS
   * ========================================================================= */
  it("[Positive] should call ResponseHandler.rateLimitExceeded with localized message when login limit exceeded", () => {
    (getLanguage as jest.Mock).mockReturnValue("fr");
    const handler = (loginRateLimiter as any).handler;

    handler(req, res, next, {});

    expect(getLanguage).toHaveBeenCalledWith(req);
    expect(ResponseHandler.rateLimitExceeded).toHaveBeenCalledWith(res, "auth.tooManyAttempts", "fr");
  });

  it("[Positive] should call ResponseHandler.rateLimitExceeded with localized message when api limit exceeded", () => {
    (getLanguage as jest.Mock).mockReturnValue("en");
    const handler = (apiRateLimiter as any).handler;

    handler(req, res, next, {});

    expect(getLanguage).toHaveBeenCalledWith(req);
    expect(ResponseHandler.rateLimitExceeded).toHaveBeenCalledWith(res, "general.rateLimitExceeded", "en");
  });

  /* =========================================================================
   * KEY GENERATOR TESTS
   * ========================================================================= */
  it("[Positive] should generate key based on request body email for forgotPasswordRateLimiter", () => {
    req.body.email = "test@domain.com";
    const keyGenerator = (forgotPasswordRateLimiter as any).keyGenerator;

    const key = keyGenerator(req);

    expect(key).toBe("test@domain.com");
  });

  it("[Edge] should fallback to request IP in forgotPasswordRateLimiter keyGenerator if email is missing", () => {
    req.body.email = undefined;
    (req as any).ip = "192.168.1.1";
    const keyGenerator = (forgotPasswordRateLimiter as any).keyGenerator;

    const key = keyGenerator(req);

    expect(key).toBe("192.168.1.1");
  });
});
