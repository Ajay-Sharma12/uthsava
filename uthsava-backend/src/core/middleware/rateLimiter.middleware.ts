import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { ResponseHandler } from "../../common/responses/response.handler";
import { getLanguage } from "../../modules/shared/helpers/language.helper";

/**
 * Creates a generic rate limit handler that uses the centralized ResponseHandler
 * to return localized error messages based on the requester's language preference.
 * 
 * @param messageKey The localization key for the specific rate limit error message.
 * @returns An Express middleware handler function.
 */
const createRateLimitHandler = (messageKey: string) => {
  return (req: Request, res: Response, next: NextFunction, options: any) => {
    const lang = getLanguage(req);
    // Send 429 response using common ResponseHandler with localized message
    ResponseHandler.rateLimitExceeded(res, messageKey, lang);
  };
};

/**
 * Login rate limiter
 * Stricter configuration to prevent brute-force attacks on authentication endpoints.
 * Skips successful requests so legitimate users are not penalized.
 */
export const loginRateLimiter = rateLimit({
  // windowMs:  5 * 60 * 1000, // 15 minutes
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 10, // 10 requests per windowMs
  handler: createRateLimitHandler("auth.tooManyAttempts"),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * General API rate limiter
 * Baseline protection for standard API endpoints to prevent general abuse and DDoS.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  handler: createRateLimitHandler("general.rateLimitExceeded"),
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Forgot password rate limiter
 * Specifically designed to prevent email spamming for password resets.
 * Uses a custom key generator to track attempts per email rather than just IP.
 */
export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per windowMs
  handler: createRateLimitHandler("auth.tooManyPasswordResetRequests"),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit per email address to prevent spam to specific users
    return req.body.email || req.ip;
  },
});

/**
 * Strict rate limiter
 * For sensitive operations that should rarely be invoked repeatedly (e.g. state changes).
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  handler: createRateLimitHandler("general.rateLimitExceeded"),
  standardHeaders: true,
  legacyHeaders: false,
});
